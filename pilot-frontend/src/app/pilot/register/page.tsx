'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, { ErrorBox, Field, SubmitButton } from '../../components/AuthShell';
import styles from '../../styles/auth.module.css';
import { api, ApiError, PilotAuthResponse, PILOT_TOKEN_KEY, savePilotSession, storage } from '../../lib/api';

const STRENGTH_COLORS = ['#ff6b6b', '#fb923c', '#fbbf24', '#34d399'];
const STRENGTH_LABELS = ['Trop faible', 'Faible', 'Correct', 'Solide'];

function scorePassword(p: string) {
  if (!p) return -1;
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(Math.max(s - 1, 0), 3);
}

export default function PilotRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (storage.get(PILOT_TOKEN_KEY)) router.replace('/pilot');
  }, [router]);

  const score = useMemo(() => scorePassword(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');

    setLoading(true);
    try {
      const res = await api<PilotAuthResponse>('/api/v1/pilots/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
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
      kicker="Nouveau pilote"
      headline={<>Rejoignez<br />la <em>tour de contrôle.</em></>}
      lead="Créez votre compte en 30 secondes. Ensuite, un seul clic suffit pour indiquer si vous êtes en service, en pause ou en fin de journée."
    >
      <div className={styles.tabs}>
        <Link href="/pilot/login" className={styles.tab}>Connexion</Link>
        <span className={`${styles.tab} ${styles.tabActive}`}>Inscription</span>
      </div>

      <h2 className={styles.title}>Créer un compte</h2>
      <p className={styles.subtitle}>Utilisez votre email professionnel.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <ErrorBox message={error} />
        <Field label="Nom complet" icon="user" type="text" placeholder="Prénom Nom" autoComplete="name"
          required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" icon="mail" type="email" placeholder="prenom.nom@kyntus.fr" autoComplete="email"
          required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Field label="Mot de passe" icon="lock" type="password" placeholder="6 caractères minimum" autoComplete="new-password"
            required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          {password && (
            <>
              <div className={styles.strength} style={{ marginTop: 10 }}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={i <= score ? { background: STRENGTH_COLORS[score] } : undefined} />
                ))}
              </div>
              <p className={styles.hint} style={{ marginTop: 6 }}>{STRENGTH_LABELS[score]}</p>
            </>
          )}
        </div>
        <Field label="Confirmer le mot de passe" icon="lock" type="password" placeholder="••••••••" autoComplete="new-password"
          required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <SubmitButton loading={loading}>Créer mon compte</SubmitButton>
      </form>

      <p className={styles.foot}>
        Déjà inscrit ? <Link href="/pilot/login">Se connecter</Link>
      </p>
    </AuthShell>
  );
}