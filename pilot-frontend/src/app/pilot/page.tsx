'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import FxLayer, { fxBurst, Spot } from '../components/Fx';
import {
  api, ApiError, clearPilotSession, PilotData, PilotStatus,
  PILOT_KEY, PILOT_SINCE_KEY, PILOT_TOKEN_KEY, storage,
} from '../lib/api';

interface StatusDef {
  type: PilotStatus;
  label: string;
  hint: string;
  color: string;
  limitMin?: number;
  icon: React.ReactNode;
}

const STATUSES: StatusDef[] = [
  { type: 'WORKING', label: 'En service', hint: 'Disponible', color: '#34d399',
    icon: <><path d="M12 2v4" /><path d="m4.9 4.9 2.8 2.8" /><circle cx="12" cy="14" r="7" /><path d="M12 11v3l2 2" /></> },
  { type: 'PAUSE_10MIN', label: 'Pause courte', hint: '10 min', color: '#fbbf24', limitMin: 10,
    icon: <><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M6 2v2M10 2v2M14 2v2" /></> },
  { type: 'PAUSE_1H', label: 'Déjeuner', hint: '1 heure', color: '#fb923c', limitMin: 60,
    icon: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></> },
  { type: 'TOILET', label: 'Toilettes', hint: 'Courte absence', color: '#60a5fa',
    icon: <><circle cx="12" cy="5" r="2" /><path d="M9 22v-6H7l2-7h6l2 7h-2v6" /></> },
  { type: 'PRAYER', label: 'Prière', hint: 'Salat', color: '#a78bfa',
    icon: <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></> },
];

const FIN: StatusDef = { type: 'FIN_SERVICE', label: 'Fin de service', hint: '', color: '#ff6b6b', icon: null };
const ALL = [...STATUSES, FIN];

const pad = (n: number) => String(n).padStart(2, '0');
const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};
const fmtShort = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}m` : `${m} min`;
};

export default function PilotDashboard() {
  const router = useRouter();
  const [pilot, setPilot] = useState<PilotData | null>(null);
  const [since, setSince] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [pending, setPending] = useState<PilotStatus | null>(null);
  const [error, setError] = useState('');
  const [confirmFin, setConfirmFin] = useState(false);
  const finTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearPilotSession();
    router.replace('/pilot/login');
  }, [router]);

  // Session: token + refresh mn serveur
  useEffect(() => {
    const token = storage.get(PILOT_TOKEN_KEY);
    if (!token) { router.replace('/pilot/login'); return; }

    const cached = storage.get(PILOT_KEY);
    if (cached) { try { setPilot(JSON.parse(cached)); } catch { /* ignore */ } }

    api<PilotData>('/api/v1/pilots/me', { token })
      .then((p) => {
        setPilot(p);
        storage.set(PILOT_KEY, JSON.stringify(p));
        const saved = storage.get(PILOT_SINCE_KEY);
        const [st, ts] = saved ? saved.split('|') : [];
        if (st === p.status && ts) setSince(Number(ts));
        else { const t = Date.now(); setSince(t); storage.set(PILOT_SINCE_KEY, `${p.status}|${t}`); }
      })
      .catch((e) => { if (e instanceof ApiError && (e.status === 401 || e.status === 403)) logout(); });
  }, [router, logout]);

  // Horloge
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const updateStatus = useCallback(async (status: PilotStatus, origin?: { x: number; y: number }) => {
    if (!pilot || pending || pilot.status === status) return;
    const token = storage.get(PILOT_TOKEN_KEY);
    setPending(status);
    setError('');
    try {
      const updated = await api<PilotData>('/api/v1/pilots/me/status', {
        method: 'PATCH', token, body: JSON.stringify({ status }),
      });
      const t = Date.now();
      setPilot(updated);
      setSince(t);
      storage.set(PILOT_KEY, JSON.stringify(updated));
      storage.set(PILOT_SINCE_KEY, `${status}|${t}`);
      const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      fxBurst(o.x, o.y, ALL.find((s) => s.type === status)?.color, 1.4);
      if (status === 'FIN_SERVICE') setTimeout(logout, 1600);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return logout();
      setError(e instanceof ApiError ? e.message : 'Erreur de connexion au serveur.');
    } finally {
      setPending(null);
    }
  }, [pilot, pending, logout]);

  // Raccourcis clavier 1..5
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < STATUSES.length) updateStatus(STATUSES[idx].type);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [updateStatus]);

  const handleFin = () => {
    if (!confirmFin) {
      setConfirmFin(true);
      if (finTimer.current) clearTimeout(finTimer.current);
      finTimer.current = setTimeout(() => setConfirmFin(false), 3500);
      return;
    }
    setConfirmFin(false);
    updateStatus('FIN_SERVICE');
  };

  if (!pilot) {
    return <div className={styles.loadingScreen}><span className={styles.loader} /></div>;
  }

  const current = ALL.find((s) => s.type === pilot.status) ?? STATUSES[0];
  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const isPause = pilot.status !== 'WORKING' && pilot.status !== 'FIN_SERVICE';
  const pauseToday = (pilot.dailyPauseTime || 0) + (isPause ? elapsed : 0);
  const overLimit = current.limitMin ? elapsed > current.limitMin * 60 : false;
  const progress = current.limitMin ? Math.min(elapsed / (current.limitMin * 60), 1) : 0;
  const firstName = pilot.name.split(' ')[0];
  const clock = new Date(now).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={styles.page} style={{ ['--status' as string]: current.color }}>
      <div className={styles.glow} />
      <FxLayer accent={current.color} />

      <header className={styles.topbar}>
        <div className={styles.logo}><span className={styles.logoMark}>P</span>PilotX</div>
        <div className={styles.user}>
          <div className={styles.avatar}>{pilot.name.charAt(0).toUpperCase()}</div>
          <div className={styles.userText}>
            <strong>{pilot.name}</strong>
            <span>@{pilot.username}</span>
          </div>
          <button className={styles.ghostBtn} onClick={logout} aria-label="Se déconnecter" data-magnetic>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={`${styles.hero} fx-in`}>
          <div className={styles.heroLeft}>
            <p className={styles.greet}>Salut {firstName} · <span>{today}</span></p>
            <div className={styles.statusLine}>
              <span className={styles.statusDot} />
              <h1 className={styles.statusLabel}>{current.label}</h1>
            </div>
            <p className={styles.sinceText}>depuis <b className={overLimit ? styles.over : ''}>{fmtClock(elapsed)}</b>{overLimit && <em className={styles.overTag}>Dépassement</em>}</p>
            {current.limitMin && (
              <div className={styles.progress}><span style={{ width: `${progress * 100}%` }} className={overLimit ? styles.progressOver : ''} /></div>
            )}
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric} data-spot><Spot /><span>Heure</span><strong>{clock}</strong></div>
            <div className={styles.metric} data-spot><Spot /><span>Pause aujourd&apos;hui</span><strong>{fmtShort(pauseToday)}</strong></div>
          </div>
        </section>

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.grid}>
          {STATUSES.map((s, i) => {
            const active = pilot.status === s.type;
            return (
              <button
                key={s.type}
                className={`${styles.tile} ${active ? styles.tileActive : ''} fx-in`}
                style={{ ['--c' as string]: s.color, ['--i' as string]: i + 1 }}
                data-spot data-tilt="10" data-ripple
                onClick={(e) => updateStatus(s.type, { x: e.clientX, y: e.clientY })}
                disabled={!!pending}
                aria-pressed={active}
              >
                <Spot />
                <span className={styles.key}>{i + 1}</span>
                <span className={styles.tileIcon}>
                  {pending === s.type ? <span className={styles.loaderSm} /> :
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>}
                </span>
                <span className={styles.tileLabel}>{s.label}</span>
                <span className={styles.tileHint}>{active ? 'Statut actuel' : s.hint}</span>
              </button>
            );
          })}
        </section>

        <button
          className={`${styles.finBtn} ${confirmFin ? styles.finConfirm : ''} ${pilot.status === 'FIN_SERVICE' ? styles.finDone : ''} fx-in`}
          style={{ ['--i' as string]: 6 }}
          data-ripple
          onClick={handleFin}
          disabled={!!pending || pilot.status === 'FIN_SERVICE'}
        >
          {pilot.status === 'FIN_SERVICE'
            ? 'Service terminé — à demain 👋'
            : pending === 'FIN_SERVICE' ? 'Clôture…'
            : confirmFin ? 'Cliquez encore pour confirmer la fin de service'
            : 'Terminer mon service'}
        </button>

        <p className={styles.shortcut}>Astuce : utilisez les touches <kbd>1</kbd>–<kbd>5</kbd> pour changer de statut.</p>
      </main>
    </div>
  );
}