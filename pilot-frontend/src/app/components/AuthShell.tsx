'use client';

import React, { useState } from 'react';
import styles from '../styles/auth.module.css';

export const STATUS_LEGEND = [
  { label: 'En service', color: '#34d399' },
  { label: 'Pause courte', color: '#fbbf24' },
  { label: 'Déjeuner', color: '#fb923c' },
  { label: 'Toilettes', color: '#60a5fa' },
  { label: 'Prière', color: '#a78bfa' },
  { label: 'Fin de service', color: '#ff6b6b' },
];

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

          <svg className={styles.pulseLine} viewBox="0 0 520 70" preserveAspectRatio="none" aria-hidden>
            <path d="M0 40 H140 L160 40 L172 12 L186 62 L200 26 L212 40 H300 L316 40 L326 20 L338 54 L348 40 H520" />
          </svg>

          <div className={styles.legend}>
            {STATUS_LEGEND.map((s) => (
              <span key={s.label} className={styles.chip} style={{ ['--c' as string]: s.color }}>
                <i />{s.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.brandFoot}>KYNTUS · SUIVI EN TEMPS RÉEL</div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}

/* ---------- Petits composants partagés ---------- */

const ICONS: Record<string, React.ReactNode> = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
};

export function Icon({ name, className }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: string;
}

export function Field({ label, icon, type, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrap}>
        <Icon name={icon} className={styles.inputIcon} />
        <input className={styles.input} type={isPassword && show ? 'text' : type} {...props} />
        {isPassword && (
          <button type="button" className={styles.eye} onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer' : 'Afficher'}>
            <Icon name={show ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </span>
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className={styles.error} role="alert">
      <span style={{ width: 18, height: 18, flexShrink: 0, display: 'inline-flex' }}><Icon name="alert" /></span>
      <span>{message}</span>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" className={styles.submit} disabled={loading}>
      {loading ? <span className={styles.spinner} /> : <>{children}<Icon name="arrow" /></>}
    </button>
  );
}