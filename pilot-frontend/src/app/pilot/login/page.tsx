'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// ⚠️ THE FIX: URL dyal Serveur
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:6225';

export default function PilotLogin() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'bio' | 'classic'>('bio');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateRandomBuffer = (length: number) => {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array;
  };

  const handleWindowsHelloLogin = async () => {
    if (!username) {
      alert("Please enter your username first to use Windows Hello.");
      return;
    }

    setIsScanning(true);
    try {
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: generateRandomBuffer(32),
        rpId: window.location.hostname,
        userVerification: "required",
        timeout: 60000
      };

      const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
      
      if (credential) {
        submitWebAuthnLogin(credential.id);
      }
    } catch (err) {
      console.error(err);
      alert("Authentication cancelled or failed.");
      setIsScanning(false);
    }
  };

  const submitWebAuthnLogin = async (credentialId: string) => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/pilots/webauthn-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, credentialId }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('pilot', JSON.stringify(data));
        router.push('/pilot');
      } else {
        const errorData = await res.text();
        alert("Biometric Auth Failed: " + errorData);
        setIsScanning(false);
      }
    } catch (err) {
      alert("Server unreachable.");
      setIsScanning(false);
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
            className={`${styles.toggleBtn} ${loginMethod === 'bio' ? styles.active : ''}`}
            onClick={() => setLoginMethod('bio')}
            type="button"
          >
            Windows Hello
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
          <div className={styles.bioContainer}>
            <input 
              type="text" 
              placeholder="Enter your Username first" 
              required 
              className={styles.input} 
              style={{ width: '100%' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)} 
            />

            {isLoading ? (
              <div className={styles.loadingText}>Verifying Credentials...</div>
            ) : (
              <>
                <button 
                  className={`${styles.fingerprintBtn} ${isScanning ? styles.scanning : ''}`}
                  onClick={handleWindowsHelloLogin}
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
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {isScanning ? 'Awaiting Windows Hello...' : 'Click to scan fingerprint'}
                </p>
              </>
            )}
          </div>
        )}

        <p className={styles.link} onClick={() => router.push('/pilot/register')}>New pilot? Register here</p>
      </div>
    </div>
  );
}