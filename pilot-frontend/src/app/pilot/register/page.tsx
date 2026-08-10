'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const PROMPTS = [
  "le ciel est bleu",
  "je mange une pomme",
  "la voiture est rouge",
  "il fait beau ce matin",
  "le chat dort sur le lit",
  "nous allons au travail"
];

// ⚠️ THE FIX: Production Ready
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:6225';

export default function PilotRegister() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [audios, setAudios] = useState<Blob[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setCurrentAudioBlob(audioBlob);
          setHasRecorded(true);
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setHasRecorded(false);
      } catch (err) {
        alert("Microphone access denied or not available.");
        console.error(err);
      }
    }
  };

  const handleNextPrompt = () => {
    if (!currentAudioBlob) return;

    const newAudios = [...audios, currentAudioBlob];
    setAudios(newAudios);

    if (currentPromptIndex < PROMPTS.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
      setHasRecorded(false);
      setCurrentAudioBlob(null);
    } else {
      submitFullRegistration(newAudios);
    }
  };

  const submitFullRegistration = async (finalAudios: Blob[]) => {
    setStep(3);
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('password', password);
    
    finalAudios.forEach((blob, index) => {
      formData.append('audios', blob, `audio_${index}.webm`);
    });

    try {
      const res = await fetch(`${API_URL}/api/v1/pilots/register`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert("Voice Profile Calibrated! Account created.");
        router.push('/pilot/login');
      } else {
        const errorText = await res.text();
        alert("Calibration Failed: " + errorText);
        setStep(1);
        setAudios([]);
        setCurrentPromptIndex(0);
        setHasRecorded(false);
      }
    } catch (err) {
      alert("Server unreachable.");
      setStep(1);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.autoBlob}></div>
      
      <div className={styles.formCard}>
        {step === 1 && (
          <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2>Pilot Registration</h2>
            <p className={styles.subtitle}>Step 1: Basic Information</p>
            
            <input type="text" placeholder="Full Name" required className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Username" required className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" required className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
            
            <button type="submit" className={styles.btn}>Continue to Voice Setup</button>
            <p className={styles.link} onClick={() => router.push('/pilot/login')}>Already have an account? Login</p>
          </form>
        )}

        {step === 2 && (
          <div className={styles.botContainer}>
            <h2>Voice Calibration</h2>
            <p className={styles.subtitle}>Click the mic to start, read the phrase, then click again to stop.</p>
            
            <div className={styles.promptBox}>
              <span className={styles.promptLabel}>Phrase {currentPromptIndex + 1} of {PROMPTS.length}</span>
              <div className={styles.promptText}>"{PROMPTS[currentPromptIndex]}"</div>
            </div>

            <button 
              className={`${styles.micBtn} ${isRecording ? styles.recording : ''}`}
              onClick={toggleRecording}
              type="button"
            >
              {isRecording ? (
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12"></rect>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              )}
            </button>
            
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              {isRecording ? 'Recording... Click to stop' : (hasRecorded ? 'Click mic to re-record' : 'Click mic to start')}
            </p>

            {hasRecorded && (
              <button className={styles.nextBtn} onClick={handleNextPrompt} type="button">
                {currentPromptIndex < PROMPTS.length - 1 ? 'Next Phrase ➔' : 'Finish & Calibrate ✓'}
              </button>
            )}

            <div className={styles.progressDots}>
              {PROMPTS.map((_, idx) => (
                <div key={idx} className={`${styles.dot} ${idx === currentPromptIndex ? styles.active : ''} ${idx < currentPromptIndex ? styles.done : ''}`}></div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Extracting Vocal DNA & Generating Master Key...</p>
          </div>
        )}
      </div>
    </div>
  );
}