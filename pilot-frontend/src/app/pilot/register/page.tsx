'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// ⚠️ THE FIX: URL dyal Serveur
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:6225';

export default function PilotRegister() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const generateRandomBuffer = (length: number) => {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array;
  };

  const registerWindowsHello = async () => {
    setIsScanning(true);
    try {
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: generateRandomBuffer(32),
        rp: {
          name: "PilotX System",
          id: window.location.hostname
        },
        user: {
          id: generateRandomBuffer(16),
          name: username,
          displayName: name
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      };

      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
      
      if (credential) {
        submitFullRegistration(credential.id);
      }
    } catch (err) {
      console.error(err);
      alert("Registration cancelled or device not supported.");
      setIsScanning(false);
    }
  };

  const submitFullRegistration = async (credentialId: string) => {
    setStep(3);
    
    try {
      const res = await fetch(`${API_URL}/api/v1/pilots/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          password,
          webAuthnCredentialId: credentialId
        }),
      });

      if (res.ok) {
        alert("Biometric Profile Calibrated! Account created.");
        router.push('/pilot/login');
      } else {
        const errorText = await res.text();
        alert("Registration Failed: " + errorText);
        setStep(1);
        setIsScanning(false);
      }
    } catch (err) {
      alert("Server unreachable.");
      setStep(1);
      setIsScanning(false);
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
            
            <button type="submit" className={styles.btn}>Continue to Biometrics</button>
            <p className={styles.link} onClick={() => router.push('/pilot/login')}>Already have an account? Login</p>
          </form>
        )}

        {step === 2 && (
          <div className={styles.botContainer}>
            <h2>Windows Hello Setup</h2>
            <p className={styles.subtitle}>Click the fingerprint icon to register your device biometrics.</p>
            
            <button 
              className={`${styles.fingerprintBtn} ${isScanning ? styles.scanning : ''}`}
              onClick={registerWindowsHello}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"></path>
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88"></path>
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"></path>
                <path d="M2 12a10 10 0 0 1 18-6"></path>
                <path d="M2 16h.01"></path>
                <path d="M21.8 16c.2-2 .131-5.354 0-6"></path>
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"></path>
                <path d="M8.65 22c.21-.66.45-1.32.57-2"></path>
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2"></path>
              </svg>
            </button>
            
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              {isScanning ? 'Awaiting Windows Hello prompt...' : 'Click to scan fingerprint'}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Securing Biometric Profile...</p>
          </div>
        )}
      </div>
    </div>
  );
}