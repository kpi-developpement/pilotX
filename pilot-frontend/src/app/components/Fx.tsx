'use client';

import React, { useEffect, useRef, useState } from 'react';

/* =====================================================================
   PILOTX FX — background interactif + effets globaux
   - Canvas: grille de points qui réagit à la souris (répulsion + glow)
     + ondes de choc au clic / changement de statut
   - [data-spot]     → spotlight qui suit la souris (bordure + fond)
   - [data-tilt]     → tilt 3D au survol
   - [data-magnetic] → bouton attiré par la souris
   - [data-ripple]   → onde au clic
   ===================================================================== */

type Burst = { x: number; y: number; r: number; color: string; life: number; strength: number };

export function fxBurst(x: number, y: number, color = '#c8ff2e', strength = 1) {
  window.dispatchEvent(new CustomEvent('fx:burst', { detail: { x, y, color, strength } }));
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function FxLayer({ accent = '#c8ff2e', density = 28 }: { accent?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef(accent);
  accentRef.current = accent;

  /* ---------- Canvas (optimisé: batch draw, throttle idle, pause onglet caché) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, raf = 0, gap = density, cols = 0, rows = 0;
    let lastFrame = 0, lastActivity = performance.now();
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
    const bursts: Burst[] = [];
    const RADIUS = 170, R2 = RADIUS * RADIUS;
    const BUCKETS = 4; // niveaux d'opacité pour les points "calmes" (1 fill par niveau)
    const paths: Path2D[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // max ~2200 points quelle que soit la taille d'écran
      gap = Math.max(density, Math.sqrt((w * h) / 2200));
      cols = Math.ceil(w / gap) + 1; rows = Math.ceil(h / gap) + 1;
    };

    const wake = () => { lastActivity = performance.now(); if (!raf) raf = requestAnimationFrame(draw); };
    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; wake(); };
    const onLeave = () => { mouse.active = false; };
    const onDown = (e: PointerEvent) => { bursts.push({ x: e.clientX, y: e.clientY, r: 0, color: accentRef.current, life: 1, strength: 0.6 }); wake(); };
    const onBurst = (e: Event) => {
      const d = (e as CustomEvent).detail;
      bursts.push({ x: d.x, y: d.y, r: 0, color: d.color, life: 1, strength: d.strength ?? 1 });
      wake();
    };
    const onVisibility = () => { if (!document.hidden) wake(); };

    function draw(t: number) {
      raf = 0;
      if (document.hidden) return;

      // Idle (pas de souris depuis 2s, pas d'onde) → ~20 fps suffisent pour la respiration
      const idle = t - lastActivity > 2000 && bursts.length === 0;
      if (idle && t - lastFrame < 50) { raf = requestAnimationFrame(draw); return; }
      lastFrame = t;

      ctx!.clearRect(0, 0, w, h);
      if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * 0.14;
      mouse.sy += (mouse.y - mouse.sy) * 0.14;
      const acc = hexToRgb(accentRef.current);

      // spotlight doux
      if (mouse.active) {
        const g = ctx!.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 440);
        g.addColorStop(0, `rgba(${acc.r},${acc.g},${acc.b},0.13)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, w, h);
      }

      // ondes
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.r += 9 + 6 * b.strength;
        b.life -= 0.012 / Math.max(b.strength, 0.4);
        if (b.life <= 0) { bursts.splice(i, 1); continue; }
        const c = hexToRgb(b.color);
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.4 * b.life})`;
        ctx!.lineWidth = 1.5 + 2 * b.life;
        ctx!.stroke();
      }

      for (let k = 0; k < BUCKETS; k++) paths[k] = new Path2D();
      const time = t * 0.0006;
      const hot: { x: number; y: number; s: number; a: number }[] = [];
      const hasBursts = bursts.length > 0;

      for (let iy = 0; iy < rows; iy++) {
        const cy = Math.cos(iy * 0.3 + time * 1.6);
        for (let ix = 0; ix < cols; ix++) {
          let x = ix * gap, y = iy * gap;
          const wave = Math.sin(ix * 0.35 + time * 2) * cy; // -1..1
          let glow = 0, push = 0, nx = 0, ny = 0;

          if (mouse.active) {
            const dx = x - mouse.sx, dy = y - mouse.sy;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              const d = Math.sqrt(d2) || 1;
              const f = 1 - d / RADIUS;
              glow = f * f; push = glow * 16; nx = dx / d; ny = dy / d;
            }
          }
          if (hasBursts) {
            for (const b of bursts) {
              const dx = x - b.x, dy = y - b.y;
              const d = Math.sqrt(dx * dx + dy * dy) || 1;
              const band = Math.abs(d - b.r);
              if (band < 40) {
                const f = (1 - band / 40) * b.life * b.strength;
                if (f > glow) { glow = f; nx = dx / d; ny = dy / d; }
                push += f * 10;
              }
            }
          }

          if (glow > 0.05) {
            hot.push({ x: x + nx * push, y: y + ny * push, s: 1.1 + glow * 1.8, a: Math.min(0.2 + glow * 0.85, 1) });
          } else {
            const k = Math.min(BUCKETS - 1, Math.max(0, Math.floor(((wave + 1) / 2) * BUCKETS)));
            paths[k].rect(x - 0.6, y - 0.6, 1.2, 1.2);
          }
        }
      }

      // points calmes: 1 fill par niveau (rapide)
      for (let k = 0; k < BUCKETS; k++) {
        ctx!.fillStyle = `rgba(200,215,255,${0.06 + k * 0.035})`;
        ctx!.fill(paths[k]);
      }
      // points actifs (peu nombreux)
      ctx!.fillStyle = `rgb(${acc.r},${acc.g},${acc.b})`;
      for (const p of hot) {
        ctx!.globalAlpha = p.a;
        ctx!.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx!.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('fx:burst', onBurst);
    raf = requestAnimationFrame(draw);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('fx:burst', onBurst);
    };
  }, [density]);

  /* ---------- Spotlight / tilt / magnetic / ripple ---------- */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last: PointerEvent | null = null;
    let tiltEl: HTMLElement | null = null;
    const magnets = new Set<HTMLElement>();
    const lit = new Set<HTMLElement>();

    const frame = () => {
      raf = 0;
      if (!last) return;
      const { clientX: x, clientY: y } = last;
      const RANGE = 320;

      // ---- 1) LECTURES (getBoundingClientRect) ----
      const spots = document.querySelectorAll<HTMLElement>('[data-spot]');
      const sRects: DOMRect[] = [];
      spots.forEach((el) => sRects.push(el.getBoundingClientRect()));

      const target = reduce ? null : ((last.target as HTMLElement | null)?.closest?.('[data-tilt]') as HTMLElement | null);
      const tRect = target ? target.getBoundingClientRect() : null;

      const mags = reduce ? ([] as unknown as NodeListOf<HTMLElement>) : document.querySelectorAll<HTMLElement>('[data-magnetic]');
      const mRects: DOMRect[] = [];
      mags.forEach((el) => mRects.push(el.getBoundingClientRect()));

      // ---- 2) ÉCRITURES ----
      // spotlight: seulement les cartes proches de la souris
      spots.forEach((el, i) => {
        const r = sRects[i];
        const near = x > r.left - RANGE && x < r.right + RANGE && y > r.top - RANGE && y < r.bottom + RANGE;
        if (near) {
          el.style.setProperty('--mx', `${Math.round(x - r.left)}px`);
          el.style.setProperty('--my', `${Math.round(y - r.top)}px`);
          lit.add(el);
        } else if (lit.has(el)) {
          el.style.setProperty('--mx', '-999px');
          el.style.setProperty('--my', '-999px');
          lit.delete(el);
        }
      });

      if (reduce) return;

      // tilt
      if (tiltEl && tiltEl !== target) { tiltEl.style.transform = ''; tiltEl = null; }
      if (target && tRect) {
        tiltEl = target;
        const px = (x - tRect.left) / tRect.width - 0.5, py = (y - tRect.top) / tRect.height - 0.5;
        const max = Number(target.dataset.tilt) || 8;
        target.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
      }

      // magnétique
      mags.forEach((el, i) => {
        const r = mRects[i];
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const pad = 40;
        const inside = x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
        if (inside && !(el as HTMLButtonElement).disabled) {
          el.style.transform = `translate(${((x - cx) * 0.12).toFixed(1)}px, ${((y - cy) * 0.25).toFixed(1)}px)`;
          magnets.add(el);
        } else if (magnets.has(el)) {
          el.style.transform = '';
          magnets.delete(el);
        }
      });
    };

    const onMove = (e: PointerEvent) => { last = e; if (!raf) raf = requestAnimationFrame(frame); };

    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-ripple]') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const span = document.createElement('span');
      span.className = 'fx-ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - r.left - size / 2}px`;
      span.style.top = `${e.clientY - r.top - size / 2}px`;
      el.appendChild(span);
      setTimeout(() => span.remove(), 700);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="fx-canvas" aria-hidden />;
}

/* ---------- Spot: calque spotlight à mettre dans une carte ---------- */
export function Spot() {
  return <span className="fx-spot" aria-hidden />;
}

/* ---------- Nombre animé ---------- */
export function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); fromRef.current = value; };
  }, [value, duration]);

  return <span className="fx-num">{display}</span>;
}