'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // L'backend ki-sifet { token: "...", username: "admin" }
        localStorage.setItem('adminToken', data.token);
        router.push('/admin/dashboard');
      } else {
        setError('Invalid admin credentials.');
      }
    } catch (err) {
      setError('Server unreachable.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.autoBlob}></div>
      <div className={styles.glassOverlay}></div>
      
      <div className={styles.loginCard}>
        <div className={styles.logoBox}>P</div>
        <h2>Admin Portal</h2>
        <p>Access the live monitoring network.</p>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <input 
            type="text" 
            placeholder="Username" 
            required 
            className={styles.input} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            required 
            className={styles.input} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button type="submit" className={styles.btn}>Connect</button>
        </form>
      </div>
    </div>
  );
}