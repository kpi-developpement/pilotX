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

export function fxBurst(x: number, y: number, color = '#d4ff3f', strength = 1) {
  window.dispatchEvent(new CustomEvent('fx:burst', { detail: { x, y, color, strength } }));
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function FxLayer({ accent = '#d4ff3f', density = 30 }: { accent?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef(accent);
  accentRef.current = accent;

  /* ---------- Canvas ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = 1, raf = 0;
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
    const bursts: Burst[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; };
    const onLeave = () => { mouse.active = false; };
    const onDown = (e: PointerEvent) => bursts.push({ x: e.clientX, y: e.clientY, r: 0, color: accentRef.current, life: 1, strength: 0.6 });
    const onBurst = (e: Event) => {
      const d = (e as CustomEvent).detail;
      bursts.push({ x: d.x, y: d.y, r: 0, color: d.color, life: 1, strength: d.strength ?? 1 });
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('fx:burst', onBurst);

    const gap = density;
    const RADIUS = 170;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      // souris lissée
      if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * 0.12;
      mouse.sy += (mouse.y - mouse.sy) * 0.12;

      const acc = hexToRgb(accentRef.current);

      // spotlight doux
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 420);
        g.addColorStop(0, `rgba(${acc.r},${acc.g},${acc.b},0.10)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // ondes
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.r += 9 + 6 * b.strength;
        b.life -= 0.012 / Math.max(b.strength, 0.4);
        if (b.life <= 0) { bursts.splice(i, 1); continue; }
        const c = hexToRgb(b.color);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.35 * b.life})`;
        ctx.lineWidth = 1.5 + 2 * b.life;
        ctx.stroke();
      }

      // grille de points
      const cols = Math.ceil(w / gap) + 1, rows = Math.ceil(h / gap) + 1;
      const time = t * 0.0006;
      for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
          let x = ix * gap, y = iy * gap;
          // respiration ambiante
          const wave = Math.sin(ix * 0.35 + time * 2) * Math.cos(iy * 0.3 + time * 1.6);
          let alpha = 0.07 + wave * 0.03;
          let size = 1;
          let glow = 0;

          // répulsion souris
          if (mouse.active) {
            const dx = x - mouse.sx, dy = y - mouse.sy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < RADIUS) {
              const f = 1 - d / RADIUS;
              const ease = f * f;
              x += (dx / (d || 1)) * ease * 16;
              y += (dy / (d || 1)) * ease * 16;
              alpha += ease * 0.75;
              size += ease * 1.6;
              glow = ease;
            }
          }

          // ondes de choc
          for (const b of bursts) {
            const dx = x - b.x, dy = y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const band = Math.abs(d - b.r);
            if (band < 40) {
              const f = (1 - band / 40) * b.life * b.strength;
              x += (dx / (d || 1)) * f * 10;
              y += (dy / (d || 1)) * f * 10;
              alpha += f * 0.8;
              size += f * 1.4;
              glow = Math.max(glow, f);
            }
          }

          if (glow > 0.05) {
            ctx.fillStyle = `rgba(${acc.r},${acc.g},${acc.b},${Math.min(alpha, 1)})`;
          } else {
            ctx.fillStyle = `rgba(255,255,255,${Math.max(alpha, 0.03)})`;
          }
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
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

    const frame = () => {
      raf = 0;
      if (!last) return;
      const { clientX: x, clientY: y } = last;

      // spotlight sur toutes les cartes visibles
      document.querySelectorAll<HTMLElement>('[data-spot]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
        el.style.setProperty('--mx', `${x - r.left}px`);
        el.style.setProperty('--my', `${y - r.top}px`);
      });

      if (reduce) return;

      // tilt
      const target = (last.target as HTMLElement | null)?.closest?.('[data-tilt]') as HTMLElement | null;
      if (tiltEl && tiltEl !== target) { tiltEl.style.transform = ''; tiltEl = null; }
      if (target) {
        tiltEl = target;
        const r = target.getBoundingClientRect();
        const px = (x - r.left) / r.width - 0.5, py = (y - r.top) / r.height - 0.5;
        const max = Number(target.dataset.tilt) || 8;
        target.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
      }

      // magnétique
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const r = el.getBoundingClientRect();
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