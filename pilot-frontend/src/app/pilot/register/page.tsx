'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function PilotRegister() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/pilots/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    });

    if (res.ok) {
      alert("Account created! You can login now.");
      router.push('/pilot/login');
    } else {
      const errorText = await res.text();
      alert("Backend Error: " + errorText); // Db ghadi ytle3 lik chno w9e3 bdabt !
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleRegister} className={styles.formCard}>
        <h2>Register Pilot</h2>
        <input type="text" placeholder="Full Name" required className={styles.input} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="Username" required className={styles.input} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" required className={styles.input} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className={styles.btn}>Register</button>
        <p className={styles.link} onClick={() => router.push('/pilot/login')}>Already have an account? Login</p>
      </form>
    </div>
  );
}