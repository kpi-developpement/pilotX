'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, { ErrorBox, Field, SubmitButton } from '../../components/AuthShell';
import styles from '../../styles/auth.module.css';
import { api, ApiError, PilotAuthResponse, PILOT_TOKEN_KEY, savePilotSession, storage } from '../../lib/api';

export default function PilotLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Deja connecté → dashboard
  useEffect(() => {
    if (storage.get(PILOT_TOKEN_KEY)) router.replace('/pilot');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<PilotAuthResponse>('/api/v1/pilots/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      savePilotSession(res);
      router.push('/pilot');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      kicker="Terminal pilote"
      headline={<>Pointez.<br />Changez de statut.<br /><em>En un clic.</em></>}
      lead="Connectez-vous et indiquez votre statut. Votre superviseur le voit instantanément sur son tableau de bord."
    >
      <div className={styles.tabs}>
        <span className={`${styles.tab} ${styles.tabActive}`}>Connexion</span>
        <Link href="/pilot/register" className={styles.tab}>Inscription</Link>
      </div>

      <h2 className={styles.title}>Bon retour 👋</h2>
      <p className={styles.subtitle}>Entrez vos identifiants pour commencer votre service.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <ErrorBox message={error} />
        <Field label="Identifiant" icon="at" type="text" placeholder="ex : yassine.a" autoComplete="username"
          autoCapitalize="none" spellCheck={false} required autoFocus
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <Field label="Mot de passe" icon="lock" type="password" placeholder="••••••••" autoComplete="current-password"
          required value={password} onChange={(e) => setPassword(e.target.value)} />
        <SubmitButton loading={loading}>Se connecter</SubmitButton>
      </form>

      <p className={styles.foot}>
        Nouveau pilote ? <Link href="/pilot/register">Créer un compte</Link>
      </p>
      <Link href="/admin/login" className={styles.adminLink}>Accès superviseur →</Link>
    </AuthShell>
  );
}