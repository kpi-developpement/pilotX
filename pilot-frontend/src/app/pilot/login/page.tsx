'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../register/page.module.css'; // Nkhdmo b nefs CSS dyal Register

export default function PilotLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/pilots/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const pilotData = await res.json();
      // Nsauvegardiw l'ID f localStorage bach nsta3mloha f dashboard
      localStorage.setItem('pilot', JSON.stringify(pilotData));
      router.push('/pilot');
    } else {
      alert("Invalid credentials.");
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.formCard}>
        <h2>Pilot Login</h2>
        <input type="text" placeholder="Username" required className={styles.input} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" required className={styles.input} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className={styles.btn}>Login</button>
        <p className={styles.link} onClick={() => router.push('/pilot/register')}>Don't have an account? Register</p>
      </form>
    </div>
  );
}