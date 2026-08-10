'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const CHALLENGES = [
  "le ciel est bleu",
  "je mange une pomme",
  "la voiture est rouge",
  "il fait beau ce matin"
];

// ⚠️ THE FIX: Production Ready
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:6225';

export default function PilotLogin() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'voice' | 'classic'>('voice');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [challengeCode, setChallengeCode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setChallengeCode(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
  }, []);

  const startRecording = async () => {
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
        submitVoiceLogin(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitVoiceLogin = async (audioBlob: Blob) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'login.webm');
    formData.append('challenge_code', challengeCode);

    try {
      const res = await fetch(`${API_URL}/api/v1/pilots/voice-login`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('pilot', JSON.stringify(data.pilot));
        router.push('/pilot');
      } else {
        const errorData = await res.json();
        alert("Voice Auth Failed: " + errorData.message);
        setChallengeCode(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
      }
    } catch (err) {
      alert("Server unreachable.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/v1/pilots/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const pilotData = await res.json();
      localStorage.setItem('pilot', JSON.stringify(pilotData));
      router.push('/pilot');
    } else {
      alert("Invalid credentials.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.autoBlob}></div>
      
      <div className={styles.formCard}>
        <h2>Pilot Terminal</h2>
        <p className={styles.subtitle}>Identify yourself to access the dashboard.</p>

        <div className={styles.toggleContainer}>
          <button 
            className={`${styles.toggleBtn} ${loginMethod === 'voice' ? styles.active : ''}`}
            onClick={() => setLoginMethod('voice')}
            type="button"
          >
            Voice ID
          </button>
          <button 
            className={`${styles.toggleBtn} ${loginMethod === 'classic' ? styles.active : ''}`}
            onClick={() => setLoginMethod('classic')}
            type="button"
          >
            Password
          </button>
        </div>

        {loginMethod === 'classic' ? (
          <form onSubmit={handleClassicLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Username" required className={styles.input} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" required className={styles.input} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" className={styles.btn}>Login</button>
          </form>
        ) : (
          <div className={styles.voiceContainer}>
            <div className={styles.challengeBox}>
              <span className={styles.challengeLabel}>Read this phrase</span>
              <div className={styles.challengeText}>"{challengeCode}"</div>
            </div>

            {isLoading ? (
              <div className={styles.loadingText}>Analyzing Voice DNA...</div>
            ) : (
              <>
                <button 
                  className={`${styles.micBtn} ${isRecording ? styles.recording : ''}`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRecording ? 'Release to verify' : 'Hold to speak'}</p>
              </>
            )}
          </div>
        )}

        <p className={styles.link} onClick={() => router.push('/pilot/register')}>New pilot? Register here</p>
      </div>
    </div>
  );
}