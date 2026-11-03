'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, { ErrorBox, Field, SubmitButton } from '../../components/AuthShell';
import styles from '../../styles/auth.module.css';
import { ADMIN_TOKEN_KEY, api, ApiError, storage } from '../../lib/api';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (storage.get(ADMIN_TOKEN_KEY)) router.replace('/admin/dashboard');
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{ token: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      storage.set(ADMIN_TOKEN_KEY, data.token);
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? err.message : 'Identifiants administrateur invalides.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="ADMIN"
      kicker="Supervision"
      headline={<>Chaque pilote.<br /><em>En temps réel.</em></>}
      lead="Accédez au tableau de bord : statuts en direct, temps de pause cumulé et historique détaillé de chaque pilote."
    >
      <h2 className={styles.title}>Espace superviseur</h2>
      <p className={styles.subtitle}>Connexion réservée aux administrateurs.</p>

      <form className={styles.form} onSubmit={handleLogin}>
        <ErrorBox message={error} />
        <Field label="Identifiant" icon="user" type="text" placeholder="admin" autoComplete="username"
          required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        <Field label="Mot de passe" icon="lock" type="password" placeholder="••••••••" autoComplete="current-password"
          required value={password} onChange={(e) => setPassword(e.target.value)} />
        <SubmitButton loading={loading}>Accéder au dashboard</SubmitButton>
      </form>

      <Link href="/pilot/login" className={styles.adminLink}>← Espace pilote</Link>
    </AuthShell>
  );
}