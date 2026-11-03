'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, { ErrorBox, Field, SubmitButton } from '../../components/AuthShell';
import styles from '../../styles/auth.module.css';
import { api, ApiError, PilotAuthResponse, PILOT_TOKEN_KEY, savePilotSession, storage } from '../../lib/api';

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
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

// "Yassine Amrani" → "yassine.amrani"
function suggestUsername(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 30);
}

export default function PilotRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [touchedUser, setTouchedUser] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (storage.get(PILOT_TOKEN_KEY)) router.replace('/pilot');
  }, [router]);

  // Suggestion automatique tant que l'utilisateur n'a pas modifié l'identifiant
  useEffect(() => {
    if (!touchedUser) setUsername(suggestUsername(name));
  }, [name, touchedUser]);

  const score = useMemo(() => scorePassword(password), [password]);
  const userOk = USERNAME_RE.test(username);
  const confirmOk = confirm.length > 0 && confirm === password && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userOk) return setError('Identifiant invalide : 3 à 30 caractères (lettres minuscules, chiffres, . _ -).');
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');

    setLoading(true);
    try {
      const res = await api<PilotAuthResponse>('/api/v1/pilots/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), username, password }),
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
      <p className={styles.subtitle}>Votre identifiant servira à vous connecter.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <ErrorBox message={error} />
        <Field label="Nom complet" icon="user" type="text" placeholder="Prénom Nom" autoComplete="name"
          required autoFocus valid={name.trim().length > 1} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Identifiant" icon="at" type="text" placeholder="prenom.nom" autoComplete="username"
          autoCapitalize="none" spellCheck={false} required valid={userOk}
          value={username}
          onChange={(e) => { setTouchedUser(true); setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); }}
          hint={username ? <>Vous vous connecterez avec <b>@{username}</b></> : '3 à 30 caractères : lettres, chiffres, . _ -'} />
        <div className={styles.field}>
          <Field label="Mot de passe" icon="lock" type="password" placeholder="6 caractères minimum" autoComplete="new-password"
            required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          {password && (
            <>
              <div className={styles.strength}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={i <= score ? { background: STRENGTH_COLORS[score] } : undefined} />
                ))}
              </div>
              <span className={styles.hint} style={{ color: STRENGTH_COLORS[score] }}>{STRENGTH_LABELS[score]}</span>
            </>
          )}
        </div>
        <Field label="Confirmer le mot de passe" icon="lock" type="password" placeholder="••••••••" autoComplete="new-password"
          required value={confirm} onChange={(e) => setConfirm(e.target.value)}
          hint={confirm && !confirmOk ? 'Les mots de passe ne correspondent pas.' : undefined} />
        <SubmitButton loading={loading}>Créer mon compte</SubmitButton>
      </form>

      <p className={styles.foot}>
        Déjà inscrit ? <Link href="/pilot/login">Se connecter</Link>
      </p>
    </AuthShell>
  );
}