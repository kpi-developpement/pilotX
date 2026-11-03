'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWebSocketClient } from '../../services/websocketService';
import styles from './page.module.css';
import { ADMIN_TOKEN_KEY, api, ApiError, storage } from '../../lib/api';

type Status = 'WORKING' | 'PAUSE_10MIN' | 'PAUSE_1H' | 'TOILET' | 'PRAYER' | 'FIN_SERVICE';

interface Pilot {
  id: number;
  name: string;
  username?: string;
  status: Status;
  lastUpdated: string;
  dailyPauseTime: number;
  secondsInStatus?: number;
  receivedAt?: number; // client: wa9t fach wslat l'data
}

interface PilotLog {
  id: number;
  status: Status;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

const META: Record<Status, { label: string; color: string; limit?: number }> = {
  WORKING: { label: 'En service', color: '#34d399' },
  PAUSE_10MIN: { label: 'Pause courte', color: '#fbbf24', limit: 10 },
  PAUSE_1H: { label: 'Déjeuner', color: '#fb923c', limit: 60 },
  TOILET: { label: 'Toilettes', color: '#60a5fa' },
  PRAYER: { label: 'Prière', color: '#a78bfa' },
  FIN_SERVICE: { label: 'Hors service', color: '#6b7280' },
};
const PAUSES: Status[] = ['PAUSE_10MIN', 'PAUSE_1H', 'TOILET', 'PRAYER'];
const FILTERS: (Status | 'ALL' | 'PAUSE')[] = ['ALL', 'WORKING', 'PAUSE', ...PAUSES, 'FIN_SERVICE'];

const pad = (n: number) => String(n).padStart(2, '0');
const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};
const fmtDur = (s: number) => {
  if (!s) return '0 min';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}` : m > 0 ? `${m} min` : `${s}s`;
};
const hhmm = (iso?: string) => (iso && iso.length >= 16 ? iso.slice(11, 16) : '--:--');
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const stamp = (p: Pilot): Pilot => ({ ...p, receivedAt: Date.now() });

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [query, setQuery] = useState('');

  const [selected, setSelected] = useState<Pilot | null>(null);
  const [logs, setLogs] = useState<PilotLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const logout = useCallback(() => {
    storage.del(ADMIN_TOKEN_KEY);
    router.replace('/admin/login');
  }, [router]);

  const handleAuthError = useCallback((err: unknown) => {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { logout(); return true; }
    return false;
  }, [logout]);

  // Auth
  useEffect(() => {
    const t = storage.get(ADMIN_TOKEN_KEY);
    if (!t) router.replace('/admin/login');
    else setToken(t);
  }, [router]);

  // Data initiale
  useEffect(() => {
    if (!token) return;
    api<Pilot[]>('/api/v1/pilots', { token })
      .then((data) => setPilots(data.map(stamp)))
      .catch((err) => { if (!handleAuthError(err)) console.error(err); })
      .finally(() => setLoading(false));
  }, [token, handleAuthError]);

  // Temps réel
  useEffect(() => {
    if (!token) return;
    const client = createWebSocketClient((updated: Pilot) => {
      const p = stamp({ ...updated, secondsInStatus: updated.secondsInStatus ?? 0 });
      setPilots((prev) => prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]);
      setSelected((s) => (s && s.id === p.id ? p : s));
    });
    const origConnect = client.onConnect;
    client.onConnect = (frame) => { setLive(true); origConnect(frame); };
    client.onWebSocketClose = () => setLive(false);
    client.activate();
    return () => { client.deactivate(); };
  }, [token]);

  // Horloge
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedOf = useCallback((p: Pilot) =>
    (p.secondsInStatus ?? 0) + Math.floor((now - (p.receivedAt ?? now)) / 1000), [now]);
  const isOver = useCallback((p: Pilot) => {
    const lim = META[p.status]?.limit;
    return !!lim && elapsedOf(p) > lim * 60;
  }, [elapsedOf]);

  // KPIs
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    pilots.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    const pause = PAUSES.reduce((a, s) => a + (c[s] || 0), 0);
    return { ...c, PAUSE: pause, ALL: pilots.length } as Record<string, number>;
  }, [pilots]);
  const overCount = pilots.filter(isOver).length;
  const active = pilots.length - (counts.FIN_SERVICE || 0);

  // Filtre + tri (dépassement → pause → service → hors ligne)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (p: Pilot) => (isOver(p) ? 0 : PAUSES.includes(p.status) ? 1 : p.status === 'WORKING' ? 2 : 3);
    return pilots
      .filter((p) => filter === 'ALL' || (filter === 'PAUSE' ? PAUSES.includes(p.status) : p.status === filter))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.username || '').includes(q))
      .sort((a, b) => rank(a) - rank(b) || elapsedOf(b) - elapsedOf(a));
  }, [pilots, filter, query, isOver, elapsedOf]);

  // Détails
  const openPilot = async (p: Pilot) => {
    setSelected(p);
    setEditing(false);
    setConfirmDelete(false);
    setFormError('');
    setForm({ name: p.name, username: '', password: '' });
    setLogs([]);
    setLogsLoading(true);
    try {
      setLogs(await api<PilotLog[]>(`/api/v1/pilots/${p.id}/logs`, { token }));
    } catch (err) {
      if (!handleAuthError(err)) console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const savePilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFormError('');
    try {
      const up = stamp(await api<Pilot>(`/api/v1/pilots/${selected.id}`, { method: 'PUT', token, body: JSON.stringify(form) }));
      setPilots((prev) => prev.map((x) => (x.id === up.id ? up : x)));
      setSelected(up);
      setEditing(false);
    } catch (err) {
      if (!handleAuthError(err)) setFormError(err instanceof ApiError ? err.message : 'Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const deletePilot = async () => {
    if (!selected) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await api(`/api/v1/pilots/${selected.id}`, { method: 'DELETE', token });
      setPilots((prev) => prev.filter((x) => x.id !== selected.id));
      setSelected(null);
    } catch (err) {
      if (!handleAuthError(err)) setFormError('Erreur lors de la suppression.');
    }
  };

  // Stats dyal pilote
  const pilotStats = useMemo(() => PAUSES.map((s) => {
    const items = logs.filter((l) => l.status === s);
    return { s, count: items.length, total: items.reduce((a, l) => a + (l.durationSeconds || 0), 0) };
  }), [logs]);

  if (!token) return null;

  const clock = new Date(now).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const today = new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const segs: Status[] = ['WORKING', ...PAUSES, 'FIN_SERVICE'];

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} aria-hidden />

      {/* ---------- Topbar ---------- */}
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>P</span>PilotX<small>ADMIN</small>
        </div>
        <div className={styles.topRight}>
          <span className={`${styles.livePill} ${live ? styles.liveOn : ''}`}><i />{live ? 'Live' : 'Connexion…'}</span>
          <span className={styles.clock}>{clock}</span>
          <button className={styles.ghostBtn} onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.date}>{today}</p>
            <h1 className={styles.h1}>Tour de contrôle</h1>
          </div>
          {overCount > 0 && (
            <div className={styles.alert}><span className={styles.alertDot} />{overCount} pilote{overCount > 1 ? 's' : ''} en dépassement de pause</div>
          )}
        </div>

        {/* ---------- KPIs ---------- */}
        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Pilotes actifs</span>
            <strong className={styles.kpiValue}>{active}<small>/{pilots.length}</small></strong>
            <div className={styles.segBar}>
              {segs.map((s) => counts[s] ? (
                <span key={s} title={`${META[s].label}: ${counts[s]}`} style={{ flex: counts[s], background: META[s].color }} />
              ) : null)}
            </div>
          </div>
          <div className={styles.kpi} style={{ ['--c' as string]: META.WORKING.color }}>
            <span className={styles.kpiLabel}><i />En service</span>
            <strong className={styles.kpiValue}>{counts.WORKING || 0}</strong>
          </div>
          <div className={styles.kpi} style={{ ['--c' as string]: '#fbbf24' }}>
            <span className={styles.kpiLabel}><i />En pause</span>
            <strong className={styles.kpiValue}>{counts.PAUSE || 0}</strong>
          </div>
          <div className={`${styles.kpi} ${overCount ? styles.kpiDanger : ''}`} style={{ ['--c' as string]: '#ff6b6b' }}>
            <span className={styles.kpiLabel}><i />Dépassements</span>
            <strong className={styles.kpiValue}>{overCount}</strong>
          </div>
        </section>

        {/* ---------- Toolbar ---------- */}
        <section className={styles.toolbar}>
          <div className={styles.filters}>
            {FILTERS.map((f) => {
              const label = f === 'ALL' ? 'Tous' : f === 'PAUSE' ? 'Toutes pauses' : META[f].label;
              const color = f === 'ALL' ? '#d4ff3f' : f === 'PAUSE' ? '#fbbf24' : META[f].color;
              return (
                <button key={f} className={`${styles.chip} ${filter === f ? styles.chipOn : ''}`}
                  style={{ ['--c' as string]: color }} onClick={() => setFilter(f)}>
                  {f !== 'ALL' && <i />}{label}<b>{counts[f] || 0}</b>
                </button>
              );
            })}
          </div>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input placeholder="Rechercher un pilote…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </section>

        {/* ---------- Grid ---------- */}
        <section className={styles.grid}>
          {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className={`${styles.card} ${styles.skeleton}`} />)}

          {!loading && visible.map((p) => {
            const m = META[p.status] || META.FIN_SERVICE;
            const el = elapsedOf(p);
            const over = isOver(p);
            const off = p.status === 'FIN_SERVICE';
            const pauseToday = (p.dailyPauseTime || 0) + (PAUSES.includes(p.status) ? el : 0);
            const pct = m.limit ? Math.min(el / (m.limit * 60), 1) : 0;
            return (
              <button key={p.id} className={`${styles.card} ${over ? styles.cardOver : ''} ${off ? styles.cardOff : ''}`}
                style={{ ['--c' as string]: over ? '#ff6b6b' : m.color }} onClick={() => openPilot(p)}>
                <div className={styles.cardTop}>
                  <span className={styles.avatar}>{initials(p.name)}</span>
                  <div className={styles.who}>
                    <strong>{p.name}</strong>
                    <span>@{p.username}</span>
                  </div>
                  <span className={styles.pill}><i />{m.label}</span>
                </div>

                <div className={styles.timerRow}>
                  <span className={styles.timer}>{off ? '—' : fmtClock(el)}</span>
                  <span className={styles.timerSub}>{off ? `Déconnecté à ${hhmm(p.lastUpdated)}` : `depuis ${hhmm(p.lastUpdated)}`}</span>
                </div>

                <div className={styles.limitBar}>
                  {m.limit ? <span style={{ width: `${pct * 100}%` }} /> : null}
                </div>

                <div className={styles.cardFoot}>
                  <span>Pause aujourd&apos;hui</span>
                  <b>{fmtDur(pauseToday)}</b>
                  {over && <em>Dépassement</em>}
                </div>
              </button>
            );
          })}

          {!loading && visible.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyRing} />
              <p>{pilots.length === 0 ? 'Aucun pilote inscrit pour le moment.' : 'Aucun pilote ne correspond à ce filtre.'}</p>
            </div>
          )}
        </section>
      </main>

      {/* ---------- Drawer détails ---------- */}
      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}
            style={{ ['--c' as string]: (META[selected.status] || META.FIN_SERVICE).color }}>
            <button className={styles.close} onClick={() => setSelected(null)} aria-label="Fermer">✕</button>

            <div className={styles.dHead}>
              <span className={`${styles.avatar} ${styles.avatarLg}`}>{initials(selected.name)}</span>
              <div>
                <h2>{selected.name}</h2>
                <p>@{selected.username}</p>
              </div>
            </div>

            <div className={styles.dStatus}>
              <span className={styles.pill}><i />{(META[selected.status] || META.FIN_SERVICE).label}</span>
              <span className={styles.dTimer}>{selected.status === 'FIN_SERVICE' ? '—' : fmtClock(elapsedOf(selected))}</span>
            </div>

            <div className={styles.dTabs}>
              <button className={!editing ? styles.dTabOn : ''} onClick={() => setEditing(false)}>Activité</button>
              <button className={editing ? styles.dTabOn : ''} onClick={() => { setEditing(true); setConfirmDelete(false); }}>Modifier</button>
            </div>

            {!editing ? (
              <>
                <div className={styles.dStats}>
                  {pilotStats.map(({ s, count, total }) => (
                    <div key={s} className={styles.dStat} style={{ ['--c' as string]: META[s].color }}>
                      <span><i />{META[s].label}</span>
                      <strong>{fmtDur(total)}</strong>
                      <small>{count} fois</small>
                    </div>
                  ))}
                </div>

                <h3 className={styles.dTitle}>Historique</h3>
                <div className={styles.timeline}>
                  {logsLoading && <p className={styles.muted}>Chargement…</p>}
                  {!logsLoading && logs.length === 0 && <p className={styles.muted}>Aucune pause enregistrée.</p>}
                  {logs.map((l) => {
                    const lim = META[l.status]?.limit;
                    return (
                      <div key={l.id} className={styles.tItem} style={{ ['--c' as string]: META[l.status]?.color }}>
                        <span className={styles.tDot} />
                        <div className={styles.tBody}>
                          <strong>{META[l.status]?.label || l.status}</strong>
                          <span>{l.startTime.slice(0, 10).split('-').reverse().join('/')} · {hhmm(l.startTime)} → {hhmm(l.endTime)}</span>
                        </div>
                        <b className={lim && l.durationSeconds > lim * 60 ? styles.overTxt : ''}>{fmtDur(l.durationSeconds)}</b>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <form className={styles.dForm} onSubmit={savePilot}>
                {formError && <div className={styles.formError}>{formError}</div>}
                <label>
                  <span>Nom complet</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label>
                  <span>Nouvel identifiant</span>
                  <input placeholder={`Actuel : ${selected.username}`} value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} />
                </label>
                <label>
                  <span>Nouveau mot de passe</span>
                  <input type="password" placeholder="Laisser vide pour garder l'actuel" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </label>
                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>

                <div className={styles.danger}>
                  <div>
                    <strong>Supprimer ce pilote</strong>
                    <span>Son historique sera supprimé définitivement.</span>
                  </div>
                  <button type="button" className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteConfirm : ''}`} onClick={deletePilot}>
                    {confirmDelete ? 'Confirmer' : 'Supprimer'}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}