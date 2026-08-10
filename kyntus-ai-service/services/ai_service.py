import os
import json
import numpy as np
import librosa
import subprocess
import warnings
import speech_recognition as spr
import noisereduce as nr
from fastapi import UploadFile
from typing import List

warnings.filterwarnings('ignore')

FFMPEG_EXE = "ffmpeg"

class VoiceAIService:
    
    REG_PROMPTS = [
        "le ciel est bleu",
        "je mange une pomme",
        "la voiture est rouge",
        "il fait beau ce matin",
        "le chat dort sur le lit",
        "nous allons au travail"
    ]

    @staticmethod
    def convert_webm_to_wav(webm_path, wav_path):
        abs_webm, abs_wav = os.path.abspath(webm_path), os.path.abspath(wav_path)
        command = [FFMPEG_EXE, "-y", "-i", abs_webm, "-ar", "44100", "-ac", "1", abs_wav]
        try:
            return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0
        except Exception: 
            return False

    @staticmethod
    def verify_speech(audio_path, expected_text):
        recognizer = spr.Recognizer()
        try:
            with spr.AudioFile(audio_path) as source:
                audio_data = recognizer.record(source)
            
            text = recognizer.recognize_google(audio_data, language="fr-FR").lower()
            print(f"🗣️ [NLP] Entendu : '{text}' (Attendu: '{expected_text}')")

            exp_words = expected_text.lower().replace(".", "").replace(",", "").split()
            matches = sum(1 for w in exp_words if w in text)
            
            if len(exp_words) > 0 and (matches / len(exp_words)) < 0.5:
                return False, f"Phrase non reconnue. Entendu: '{text}'"
            return True, "Phrase Validée."

        except spr.UnknownValueError:
            return False, "Aucun mot détecté. Parlez plus clairement."
        except spr.RequestError:
            print("⚠️ [STT] Pas de connexion internet, Rejet strict par sécurité.")
            return False, "Erreur réseau STT (Fail-Secure)"

    @staticmethod
    def extract_features(audio_path, is_registration=False, step_num=1):
        try:
            y_raw, sr = librosa.load(audio_path, sr=44100)
            
            # ⚠️ THE FIX (ANTI-SDA3): stationary=False kay-filtri sda3 dyal bnadm li kayhder f l'background
            y_clean_noise = nr.reduce_noise(y=y_raw, sr=sr, stationary=False, prop_decrease=0.85)
            
            raw_rms = np.mean(librosa.feature.rms(y=y_clean_noise))
            if raw_rms < 0.0001: 
                return None, "Silence quasi-total détecté. Rapprochez-vous.", None

            y_harmonic, _ = librosa.effects.hpss(y_clean_noise)
            current_rms = np.mean(librosa.feature.rms(y=y_harmonic))
            
            target_rms = 0.03
            gain = min(max(target_rms / (current_rms + 1e-6), 1.0), 4.0) 
            y_agc = y_harmonic * gain
            y_clean = librosa.effects.preemphasis(y_agc)

            f0, voiced_flag, _ = librosa.pyin(y_clean, fmin=55, fmax=350)
            vad_percent = np.mean(voiced_flag) * 100 if voiced_flag is not None else 0
            
            if vad_percent < 2.0: 
                return None, "Voix trop faible ou enrouée.", None

            pitch = np.nanmedian(f0[voiced_flag]) if np.any(voiced_flag) else 0
            if pitch == 0: return None, "Fréquence vocale illisible.", None

            mfcc_full = librosa.feature.mfcc(y=y_clean, sr=sr, n_mfcc=40)
            mfcc = mfcc_full[1:, :] 
            
            mfcc_delta = librosa.feature.delta(mfcc)
            mfcc_delta2 = librosa.feature.delta(mfcc, order=2)
            spectral_contrast = librosa.feature.spectral_contrast(y=y_clean, sr=sr)

            acoustic_adn = np.concatenate([
                np.mean(mfcc, axis=1), np.std(mfcc, axis=1), 
                np.mean(mfcc_delta, axis=1), np.std(mfcc_delta, axis=1),
                np.mean(mfcc_delta2, axis=1), np.std(mfcc_delta2, axis=1),
                np.mean(spectral_contrast, axis=1)
            ])
            
            acoustic_adn = acoustic_adn / np.linalg.norm(acoustic_adn)
            features = np.concatenate([acoustic_adn, [pitch]])

            visual_hash = "[" + ", ".join([f"{float(x):+.3f}" for x in acoustic_adn[:5]]) + "]"

            if is_registration:
                print(f"   ↳ [Échantillon {step_num}] Pitch: {pitch:.1f}Hz | VAD: {vad_percent:.1f}% | Hash: {visual_hash}")
            
            return features, "OK", {"pitch": pitch, "gain": gain, "vad": vad_percent, "hash": visual_hash}
        except Exception as e: 
            return None, str(e), None

    @staticmethod
    def calculate_similarity(v1, v2):
        dna1, dna2 = v1[:-1], v2[:-1]
        p1, p2 = v1[-1], v2[-1] 

        cosine_sim = np.dot(dna1, dna2)
        euclidean_dist = np.linalg.norm(dna1 - dna2)
        pitch_diff = abs(p1 - p2)
        
        base_score = max(0.0, cosine_sim) * 100.0
        score = base_score
        
        euc_penalty_str = "OK"
        pitch_penalty_str = "OK"
        
        # ⚠️ THE FIX (TOLÉRANCE AU BRUIT): On relâche un tout petit peu la pénalité pour laisser passer le bruit de fond
        if euclidean_dist > 0.42:
            score *= 0.0 
            euc_penalty_str = f"REJET (Dist: {euclidean_dist:.3f} > 0.42)"
        elif euclidean_dist > 0.36:
            score *= 0.6 
            euc_penalty_str = f"x0.6 (Dist: {euclidean_dist:.3f})"
        elif euclidean_dist > 0.32:
            score *= 0.85 # Tolérance pour le bruit de fond (Score 95% -> 80.7% -> PASS)
            euc_penalty_str = f"x0.85 (Dist: {euclidean_dist:.3f})"

        if pitch_diff > 40:
            score *= 0.0 
            pitch_penalty_str = f"REJET (Diff: {pitch_diff:.1f}Hz > 40Hz)"
        elif pitch_diff > 20:
            score *= 0.8 
            pitch_penalty_str = f"x0.8 (Diff: {pitch_diff:.1f}Hz)"

        return {
            "cosine_sim": cosine_sim,
            "euclidean_dist": euclidean_dist,
            "pitch_diff": pitch_diff,
            "base_score": base_score,
            "euc_penalty_str": euc_penalty_str,
            "pitch_penalty_str": pitch_penalty_str,
            "final_score": float(max(0.0, score))
        }

    @staticmethod
    async def identify_voice(audio: UploadFile, challenge_code: str, profiles_json: str) -> dict:
        try:
            try:
                profiles_dict = json.loads(profiles_json)
            except Exception:
                return {"success": False, "message": "Erreur de lecture des profils depuis Spring Boot."}

            if not profiles_dict:
                return {"success": False, "message": "Aucun profil enregistré dans la base de données."}

            import uuid
            req_id = str(uuid.uuid4())[:8]
            temp_webm, temp_wav = f"ident_{req_id}.webm", f"ident_{req_id}.wav"
            
            try:
                with open(temp_webm, "wb") as f: f.write(await audio.read())
                if not VoiceAIService.convert_webm_to_wav(temp_webm, temp_wav): 
                    return {"success": False, "message": "Erreur Audio FFMPEG"}
                
                print("\n" + "🎯 [IDENTIFICATION - X-RAY LOGS]" + "="*50)
                
                stt_ok, stt_msg = VoiceAIService.verify_speech(temp_wav, challenge_code)
                if not stt_ok:
                    print(f"❌ REJET NLP: {stt_msg}\n" + "="*70)
                    return {"success": False, "message": stt_msg}
                
                new_f, msg, metrics = VoiceAIService.extract_features(temp_wav, is_registration=False)
                if new_f is None: return {"success": False, "message": msg} 
                
                print(f"🎙️ Voix Entrante -> Pitch: {metrics['pitch']:.1f}Hz | Hash: {metrics['hash']}")
                print("-" * 70)

                best_score = 0.0
                best_user_id = None
                
                for user_id, profile_list in profiles_dict.items():
                    master_f = np.array(profile_list)
                    
                    if len(master_f) != len(new_f):
                        continue
                    
                    math_data = VoiceAIService.calculate_similarity(master_f, new_f)
                    score = math_data['final_score']
                    
                    db_hash = "[" + ", ".join([f"{float(x):+.3f}" for x in master_f[:5]]) + "]"
                    
                    print(f"👤 Vs User ID: {user_id} | DB Hash: {db_hash}")
                    print(f"   ├─ Cosine Sim  : {math_data['cosine_sim']:.4f} (Base Score: {math_data['base_score']:.1f}%)")
                    print(f"   ├─ Euc. Dist   : {math_data['euclidean_dist']:.4f} -> Pénalité: {math_data['euc_penalty_str']}")
                    print(f"   ├─ Pitch Diff  : {math_data['pitch_diff']:.1f}Hz -> Pénalité: {math_data['pitch_penalty_str']}")
                    print(f"   └─ FINAL SCORE : {score:.1f}%")
                    print("- " * 35)
                    
                    if score > best_score:
                        best_score = score
                        best_user_id = user_id
                
                print("="*70)

                if best_score >= 75.0 and best_user_id is not None: 
                    print(f"✅ ACCÈS AUTORISÉ: Employé ID {best_user_id} avec {best_score:.1f}%")
                    return {"success": True, "identified_user_id": best_user_id, "match_score": round(best_score, 2), "message": "Identification réussie"}
                else:
                    print(f"❌ ACCÈS REFUSÉ (Meilleur score: {best_score:.1f}% < 75%)")
                    return {"success": False, "message": f"Identité Rejetée ({best_score:.1f}%).", "match_score": round(best_score, 2)}
            finally:
                for f in [temp_webm, temp_wav]: 
                    if os.path.exists(f): os.remove(f)
        except Exception as e:
            print(f"❌ ERREUR FATALE IDENTIFICATION: {str(e)}")
            return {"success": False, "message": f"Erreur Interne IA: {str(e)}"}

    @staticmethod
    async def register_voice_profile(audios: List[UploadFile], employee_id: str) -> dict:
        try:
            if len(audios) == 0: return {"success": False, "message": "Aucun fichier audio reçu."}
            
            import uuid
            req_id = str(uuid.uuid4())[:8]

            print("\n" + f"🚀 [CALIBRATION X-RAY] - User ID: {employee_id}" + "="*40)

            all_features = []
            for i, audio in enumerate(audios):
                temp_webm = f"reg_{req_id}_step{i}.webm"
                temp_wav = f"reg_{req_id}_step{i}.wav"
                try:
                    with open(temp_webm, "wb") as f: f.write(await audio.read())
                    if not VoiceAIService.convert_webm_to_wav(temp_webm, temp_wav): 
                        return {"success": False, "message": f"Erreur Audio (Etape {i+1})"}
                    
                    features, msg, m = VoiceAIService.extract_features(temp_wav, is_registration=True, step_num=i+1)
                    if features is None: 
                        print(f"   ↳ ⚠️ [Échantillon {i+1}] Ignoré: {msg}")
                        continue
                    
                    all_features.append(features)
                finally:
                    for f in [temp_webm, temp_wav]: 
                        if os.path.exists(f): os.remove(f)

            if len(all_features) == 0:
                return {"success": False, "message": "Échec de l'extraction sur tous les échantillons."}

            pitches = [f[-1] for f in all_features]
            median_pitch = np.median(pitches)
            valid_features = [f for f in all_features if abs(f[-1] - median_pitch) < 25] 
            
            if len(valid_features) == 0:
                valid_features = all_features 
                
            master_adn = np.mean(valid_features, axis=0)
            acoustic_part = master_adn[:-1]
            acoustic_part = acoustic_part / np.linalg.norm(acoustic_part)
            master_adn = np.concatenate([acoustic_part, [master_adn[-1]]])

            master_hash = "[" + ", ".join([f"{float(x):+.3f}" for x in master_adn[:5]]) + "]"

            print(f"✅ MASTER KEY GÉNÉRÉE (Basée sur {len(valid_features)}/{len(audios)} audios valides)")
            print(f"🔑 Pitch de référence : {master_adn[-1]:.1f} Hz")
            print(f"🧬 Master Hash        : {master_hash}")
            print("="*70 + "\n")
            
            return {
                "success": True, 
                "message": "Master Key créée avec succès.",
                "voice_profile": master_adn.tolist() 
            }
        except Exception as e:
            print(f"❌ ERREUR FATALE REGISTRATION: {str(e)}")
            return {"success": False, "message": f"Erreur Interne IA: {str(e)}"}