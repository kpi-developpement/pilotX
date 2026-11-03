'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './history.module.css';
import { Spot } from '../../components/Fx';
import { api, ApiError } from '../../lib/api';

/* =====================================================================
   HISTORIQUE MENSUEL — heatmap pilotes × jours + détail d'une journée
   ===================================================================== */

type Status = 'WORKING' | 'PAUSE_10MIN' | 'PAUSE_1H' | 'TOILET' | 'PRAYER' | 'FIN_SERVICE';

export interface HistoryMeta { label: string; color: string; limit?: number }

interface PilotLite { id: number; name: string; username?: string }

interface Log {
  id: number;
  pilotId: number;
  status: Status;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

interface DayStat {
  work: number;
  pause: number;
  over: number;
  first: string;
  last: string;
  logs: Log[];
}

const PAUSES: Status[] = ['PAUSE_10MIN', 'PAUSE_1H', 'TOILET', 'PRAYER'];
const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (iso: string) => iso.slice(11, 16);
const fmtH = (s: number) => {
  if (!s) return '0h';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${pad(m)}` : `${m}min`;
};
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const toMin = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));

interface Props {
  token: string | null;
  pilots: PilotLite[];
  meta: Record<Status, HistoryMeta>;
  onAuthError: (err: unknown) => boolean;
}

export default function History({ token, pilots, meta, onAuthError }: Props) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<{ pilotId: number; day: string } | null>(null);

  const days = useMemo(() => {
    const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  }, [month]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const from = ymd(days[0]), to = ymd(days[days.length - 1]);
      setLogs(await api<Log[]>(`/api/v1/pilots/history?from=${from}&to=${to}`, { token }));
    } catch (err) {
      if (!onAuthError(err)) setError(err instanceof ApiError ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [token, days, onAuthError]);

  useEffect(() => { load(); }, [load]);

  // Agrégation: pilote → jour → stats
  const grid = useMemo(() => {
    const map = new Map<number, Map<string, DayStat>>();
    for (const l of logs) {
      const day = l.startTime.slice(0, 10);
      if (!map.has(l.pilotId)) map.set(l.pilotId, new Map());
      const pm = map.get(l.pilotId)!;
      if (!pm.has(day)) pm.set(day, { work: 0, pause: 0, over: 0, first: l.startTime, last: l.endTime, logs: [] });
      const d = pm.get(day)!;
      const sec = l.durationSeconds || 0;
      if (l.status === 'WORKING') d.work += sec; else if (PAUSES.includes(l.status)) d.pause += sec;
      const lim = meta[l.status]?.limit;
      if (lim && sec > lim * 60) d.over += 1;
      if (l.startTime < d.first) d.first = l.startTime;
      if (l.endTime > d.last) d.last = l.endTime;
      d.logs.push(l);
    }
    return map;
  }, [logs, meta]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pilots
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.username || '').includes(q))
      .map((p) => {
        const pm = grid.get(p.id) || new Map<string, DayStat>();
        let work = 0, pause = 0, over = 0;
        pm.forEach((d) => { work += d.work; pause += d.pause; over += d.over; });
        return { p, pm, work, pause, over, daysActive: pm.size };
      })
      .sort((a, b) => b.work - a.work || a.p.name.localeCompare(b.p.name));
  }, [pilots, grid, query]);

  const totals = useMemo(() => rows.reduce((t, r) => ({
    work: t.work + r.work, pause: t.pause + r.pause, over: t.over + r.over, days: t.days + r.daysActive,
  }), { work: 0, pause: 0, over: 0, days: 0 }), [rows]);

  const maxWork = useMemo(() => {
    let m = 1;
    rows.forEach((r) => r.pm.forEach((d) => { if (d.work > m) m = d.work; }));
    return m;
  }, [rows]);

  const todayKey = ymd(new Date());
  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  const shift = (n: number) => { setSel(null); setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1)); };

  // Export CSV (Excel FR: séparateur ;)
  const exportCsv = () => {
    const lines = [['Pilote', 'Identifiant', 'Date', 'Début', 'Fin', 'En service', 'Pauses', 'Dépassements'].join(';')];
    rows.forEach(({ p, pm }) => {
      [...pm.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([day, d]) => {
        lines.push([p.name, p.username || '', day, hhmm(d.first), hhmm(d.last), fmtH(d.work), fmtH(d.pause), d.over].join(';'));
      });
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pilotx-historique-${ymd(month).slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const selPilot = sel ? pilots.find((p) => p.id === sel.pilotId) : null;
  const selDay = sel ? grid.get(sel.pilotId)?.get(sel.day) : null;

  return (
    <div className={styles.wrap}>
      {/* ---------- Header ---------- */}
      <div className={`${styles.head} fx-in`}>
        <div className={styles.monthNav}>
          <button onClick={() => shift(-1)} aria-label="Mois précédent" data-ripple>‹</button>
          <h2>{monthLabel}</h2>
          <button onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Mois suivant" data-ripple>›</button>
        </div>
        <div className={styles.headRight}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input placeholder="Filtrer un pilote…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className={styles.exportBtn} onClick={exportCsv} disabled={loading || logs.length === 0} data-ripple data-magnetic>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* ---------- KPIs du mois ---------- */}
      <div className={styles.kpis}>
        {[
          { l: 'Jours travaillés', v: String(totals.days), c: '#c8ff2e' },
          { l: 'Temps en service', v: fmtH(totals.work), c: meta.WORKING.color },
          { l: 'Temps de pause', v: fmtH(totals.pause), c: meta.PAUSE_10MIN.color },
          { l: 'Dépassements', v: String(totals.over), c: '#ff6385' },
        ].map((k, i) => (
          <div key={k.l} className={`${styles.kpi} fx-in`} style={{ ['--c' as string]: k.c, ['--i' as string]: i + 1 }} data-spot>
            <Spot />
            <span><i />{k.l}</span>
            <strong>{loading ? '…' : k.v}</strong>
          </div>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* ---------- Heatmap ---------- */}
      <div className={`${styles.board} fx-in`} style={{ ['--i' as string]: 5 }}>
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.stickyCol}>Pilote</th>
                {days.map((d) => {
                  const key = ymd(d);
                  const we = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th key={key} className={`${styles.dayHead} ${we ? styles.weekend : ''} ${key === todayKey ? styles.todayHead : ''}`}>
                      <small>{WEEK[(d.getDay() + 6) % 7]}</small>{d.getDate()}
                    </th>
                  );
                })}
                <th className={styles.sumHead}>Jours</th>
                <th className={styles.sumHead}>Service</th>
                <th className={styles.sumHead}>Pauses</th>
                <th className={styles.sumHead}>Dépass.</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: Math.max(3, Math.min(pilots.length, 6)) }).map((_, i) => (
                <tr key={i}><td colSpan={days.length + 5}><div className={styles.skel} /></td></tr>
              ))}

              {!loading && rows.map(({ p, pm, work, pause, over, daysActive }) => (
                <tr key={p.id}>
                  <td className={styles.stickyCol}>
                    <div className={styles.who}>
                      <span className={styles.avatar}>{initials(p.name)}</span>
                      <div><strong>{p.name}</strong><span>@{p.username}</span></div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const key = ymd(d);
                    const st = pm.get(key);
                    const intensity = st ? Math.max(0.18, st.work / maxWork) : 0;
                    const active = sel?.pilotId === p.id && sel.day === key;
                    return (
                      <td key={key} className={styles.cellTd}>
                        <button
                          className={`${styles.cell} ${st ? styles.cellOn : ''} ${active ? styles.cellActive : ''} ${key > todayKey ? styles.cellFuture : ''}`}
                          style={{ ['--a' as string]: intensity }}
                          disabled={!st}
                          onClick={() => setSel(active ? null : { pilotId: p.id, day: key })}
                          title={st ? `${d.toLocaleDateString('fr-FR')} · ${fmtH(st.work)} service · ${fmtH(st.pause)} pause` : undefined}
                        >
                          {st && st.over > 0 && <i className={styles.overDot} />}
                        </button>
                      </td>
                    );
                  })}
                  <td className={styles.sum}>{daysActive}</td>
                  <td className={styles.sum}>{fmtH(work)}</td>
                  <td className={styles.sum}>{fmtH(pause)}</td>
                  <td className={`${styles.sum} ${over ? styles.sumOver : ''}`}>{over}</td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr><td colSpan={days.length + 5} className={styles.empty}>Aucun pilote.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.legend}>
          <span>Moins</span>
          {[0.18, 0.4, 0.65, 1].map((a) => <i key={a} className={styles.legendCell} style={{ ['--a' as string]: a }} />)}
          <span>Plus de service</span>
          <span className={styles.legendSep} />
          <i className={styles.overDot} style={{ position: 'static' }} /><span>Pause dépassée</span>
        </div>
      </div>

      {/* ---------- Détail de la journée ---------- */}
      {sel && selPilot && selDay && (
        <div className={`${styles.detail} fx-in`} data-spot>
          <Spot />
          <div className={styles.detailHead}>
            <div className={styles.who}>
              <span className={styles.avatar}>{initials(selPilot.name)}</span>
              <div>
                <strong>{selPilot.name}</strong>
                <span>{new Date(sel.day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
            <div className={styles.detailStats}>
              <div><span>Début</span><b>{hhmm(selDay.first)}</b></div>
              <div><span>Fin</span><b>{hhmm(selDay.last)}</b></div>
              <div><span>Service</span><b style={{ color: meta.WORKING.color }}>{fmtH(selDay.work)}</b></div>
              <div><span>Pauses</span><b style={{ color: meta.PAUSE_10MIN.color }}>{fmtH(selDay.pause)}</b></div>
            </div>
            <button className={styles.closeBtn} onClick={() => setSel(null)} aria-label="Fermer">✕</button>
          </div>

          {/* Frise horaire */}
          {(() => {
            const startM = Math.max(0, Math.floor(toMin(selDay.first) / 60) * 60 - 30);
            const endM = Math.min(24 * 60, Math.ceil(toMin(selDay.last) / 60) * 60 + 30);
            const span = Math.max(endM - startM, 60);
            const hours: number[] = [];
            for (let m = Math.ceil(startM / 60) * 60; m <= endM; m += 60) hours.push(m);
            return (
              <div className={styles.tl}>
                <div className={styles.tlTrack}>
                  {selDay.logs.map((l) => {
                    const s = toMin(l.startTime), e = Math.max(toMin(l.endTime), s + 1);
                    return (
                      <span key={l.id} className={styles.tlSeg}
                        style={{ left: `${((s - startM) / span) * 100}%`, width: `${((e - s) / span) * 100}%`, ['--c' as string]: meta[l.status]?.color }}
                        title={`${meta[l.status]?.label} · ${hhmm(l.startTime)} → ${hhmm(l.endTime)}`} />
                    );
                  })}
                </div>
                <div className={styles.tlHours}>
                  {hours.map((m) => <span key={m} style={{ left: `${((m - startM) / span) * 100}%` }}>{pad(Math.floor(m / 60))}h</span>)}
                </div>
              </div>
            );
          })()}

          <div className={styles.segList}>
            {[...selDay.logs].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((l, i) => {
              const lim = meta[l.status]?.limit;
              const over = !!lim && l.durationSeconds > lim * 60;
              return (
                <div key={l.id} className={styles.seg} style={{ ['--c' as string]: meta[l.status]?.color, animationDelay: `${Math.min(i, 15) * 30}ms` }}>
                  <i />
                  <strong>{meta[l.status]?.label || l.status}</strong>
                  <span>{hhmm(l.startTime)} → {hhmm(l.endTime)}</span>
                  <b className={over ? styles.overTxt : ''}>{fmtH(l.durationSeconds)}{over && ' ⚠'}</b>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}