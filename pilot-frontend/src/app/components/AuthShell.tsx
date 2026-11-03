'use client';

import React, { useEffect, useState } from 'react';
import styles from '../styles/auth.module.css';
import FxLayer, { Spot } from './Fx';

export const STATUS_META = [
  { key: 'WORKING', label: 'En service', color: '#34d399' },
  { key: 'PAUSE_10MIN', label: 'Pause courte', color: '#fbbf24' },
  { key: 'PAUSE_1H', label: 'Déjeuner', color: '#fb923c' },
  { key: 'TOILET', label: 'Toilettes', color: '#60a5fa' },
  { key: 'PRAYER', label: 'Prière', color: '#a78bfa' },
];

/* ---------- Démo animée du tableau de bord (décoratif) ---------- */
const DEMO = [
  { initials: 'P1', seq: [0, 0, 1, 0, 0, 3] },
  { initials: 'P2', seq: [2, 2, 2, 0, 0, 0] },
  { initials: 'P3', seq: [0, 4, 4, 0, 1, 0] },
  { initials: 'P4', seq: [0, 0, 0, 3, 0, 0] },
];

function LiveBoard() {
  const [tick, setTick] = useState(0);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const a = setInterval(() => setTick((t) => t + 1), 2600);
    const b = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const rows = DEMO.map((r, i) => ({ ...r, s: STATUS_META[r.seq[tick % r.seq.length]], i }));
  const working = rows.filter((r) => r.s.key === 'WORKING').length;

  return (
    <div className={styles.board} aria-hidden>
      <div className={styles.boardHead}>
        <span className={styles.boardTitle}><span className={styles.liveDot} />Live</span>
        <span className={styles.boardStats}>
          <b style={{ color: '#34d399' }}>{working}</b> en service · <b style={{ color: '#fbbf24' }}>{rows.length - working}</b> en pause
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.initials} className={styles.boardRow} style={{ ['--c' as string]: r.s.color }}>
          <span className={styles.boardAvatar}>{r.initials}</span>
          <span className={styles.boardBar}><span /></span>
          <span key={r.s.key + tick} className={styles.boardPill}><i />{r.s.label}</span>
          <span className={styles.boardTime}>
            {String(Math.floor(((secs + r.i * 97) % 3600) / 60)).padStart(2, '0')}:{String((secs + r.i * 97) % 60).padStart(2, '0')}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ShellProps {
  kicker: string;
  headline: React.ReactNode;
  lead: string;
  badge?: string;
  children: React.ReactNode;
}

export default function AuthShell({ kicker, headline, lead, badge = 'PILOT', children }: ShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.aurora} aria-hidden><span /><span /><span /></div>
      <div className={styles.noise} aria-hidden />
      <FxLayer />

      <aside className={styles.brand}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>P</span>
          PilotX
          <small>{badge}</small>
        </div>

        <div className={styles.hero}>
          <div className={styles.kicker}><span className={styles.liveDot} />{kicker}</div>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.lead}>{lead}</p>
          <LiveBoard />
        </div>

        <div className={styles.brandFoot}>
          <span>KYNTUS</span><span>·</span><span>SUIVI EN TEMPS RÉEL</span>
        </div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.cardFrame} data-spot>
          <Spot />
          <div className={styles.card}>{children}</div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Petits composants partagés ---------- */

const ICONS: Record<string, React.ReactNode> = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  at: <><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></>,
  check: <><path d="m5 12 5 5L20 7" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: string;
  valid?: boolean;
  hint?: React.ReactNode;
}

export function Field({ label, icon, type, valid, hint, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.inputWrap} ${valid ? styles.inputValid : ''}`}>
        <Icon name={icon} className={styles.inputIcon} />
        <input className={styles.input} type={isPassword && show ? 'text' : type} {...props} />
        {isPassword ? (
          <button type="button" className={styles.eye} onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer' : 'Afficher'}>
            <Icon name={show ? 'eyeOff' : 'eye'} />
          </button>
        ) : valid ? (
          <span className={styles.validMark}><Icon name="check" /></span>
        ) : null}
      </span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className={styles.error} role="alert">
      <span className={styles.errorIcon}><Icon name="alert" /></span>
      <span>{message}</span>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" className={styles.submit} disabled={loading} data-magnetic data-ripple>
      <span className={styles.submitShine} />
      {loading ? <span className={styles.spinner} /> : <>{children}<Icon name="arrow" /></>}
    </button>
  );
}