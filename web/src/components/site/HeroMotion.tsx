'use client';

import { useEffect, useRef } from 'react';

type Puff = { x: number; y: number; vx: number; vy: number; r: number; grow: number; life: number; max: number };

// The hero car drives right as you scroll, trailing exhaust smoke; reversing (scrolling up) also
// smokes the front tyres. Rendered inside the hero section.
export function HeroMotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest<HTMLElement>('.hero');
    const car = hero?.querySelector<HTMLElement>('.hero-car');
    const img = car?.querySelector('img');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !hero || !car || !img || !ctx) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const header = document.querySelector<HTMLElement>('.site-header');
    const puffs: Puff[] = [];
    let running = false;
    let lastT = 0;
    let lastShift = 0;
    let frame = 0;
    let queued = false;

    const size = () => {
      const r = hero.getBoundingClientRect();
      const d = Math.min(2, devicePixelRatio || 1);
      canvas.width = r.width * d;
      canvas.height = r.height * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    // Finish the drive as the car slides under the sticky header, so the whole move is on screen.
    const driveEnd = () => {
      const r = car.getBoundingClientRect();
      // 1.6: spread the drive over more scrolling so it feels unhurried. Phones have little hero
      // left to scroll through, so there the whole drive happens while the car is still in view.
      return Math.max(1, (r.top + scrollY + r.height * 0.6 - (header?.offsetHeight ?? 0)) * (innerWidth < 768 ? 1 : 1.6));
    };

    // object-fit:contain leaves empty space around the car; find the drawn image box.
    const rear = () => {
      const b = img.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const ratio = img.naturalWidth / img.naturalHeight || 2.2;
      let w = b.width;
      let ht = w / ratio;
      if (ht > b.height) {
        ht = b.height;
        w = ht * ratio;
      }
      const left = b.left + (b.width - w) / 2 - h.left;
      const top = b.top + (b.height - ht) / 2 - h.top;
      return {
        x: left + w * 0.05,
        y: top + ht * 0.5,
        h: ht,
        right: left + w,
        heroWidth: h.width,
        // Front wheels (the car faces right): near the nose, on the top and bottom edges.
        frontX: left + w * 0.8,
        frontY: [top + ht * 0.08, top + ht * 0.92],
      };
    };

    const draw = (t: number) => {
      const dt = Math.min(50, t - lastT);
      lastT = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const s = puffs[i];
        s.life += dt;
        if (s.life >= s.max) {
          puffs.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt - 0.01 * dt;
        s.r += s.grow * dt;
        const a = 0.35 * Math.sin((Math.PI * s.life) / s.max);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(235,230,228,${a})`);
        g.addColorStop(1, 'rgba(235,230,228,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (puffs.length) frame = requestAnimationFrame(draw);
      else running = false;
    };

    // Puffs spawn at the car's rear when it moves and drift back as they fade.
    const emit = (delta: number) => {
      if (delta === 0) return;
      const n = Math.min(10, Math.ceil(Math.abs(delta) / 6));
      const r = rear();
      for (let i = 0; i < n; i++) {
        puffs.push({
          x: r.x + Math.random() * 10,
          y: r.y + (Math.random() - 0.5) * r.h * 0.7,
          vx: -(0.04 + Math.random() * 0.08) * (delta > 0 ? 1 : -0.3),
          vy: (Math.random() - 0.5) * 0.03,
          r: r.h * (0.08 + Math.random() * 0.08),
          grow: 0.02 + Math.random() * 0.03,
          life: 0,
          max: 900 + Math.random() * 700,
        });
      }
      // Reversing (scrolling up): the front tyres spin and smoke billows out from both sides,
      // left behind as the car backs away.
      if (delta < 0) {
        for (const [side, y] of r.frontY.entries()) {
          const out = side === 0 ? -1 : 1;
          for (let i = 0; i < Math.ceil(n * 0.7); i++) {
            puffs.push({
              x: r.frontX + (Math.random() - 0.5) * r.h * 0.12,
              y: y + out * Math.random() * r.h * 0.04,
              vx: (0.02 + Math.random() * 0.06),
              vy: out * (0.015 + Math.random() * 0.035),
              r: r.h * (0.06 + Math.random() * 0.07),
              grow: 0.03 + Math.random() * 0.04,
              life: 0,
              max: 1000 + Math.random() * 800,
            });
          }
        }
      }
      if (puffs.length > 360) puffs.splice(0, puffs.length - 360);
      if (!running) {
        running = true;
        lastT = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    const update = () => {
      queued = false;
      const p = Math.min(1, Math.max(0, scrollY / driveEnd()));
      // Stay on the red stage: the nose stops before the stage's right edge (6% in from the side).
      const r = rear();
      const room = Math.max(0, r.heroWidth * 0.94 - (r.right - lastShift));
      // On phones and tablets the car already fills the stage, so there's little or no room;
      // let it drive a proper distance and roll partly out of frame instead of standing still.
      const maxShift = room >= r.heroWidth * 0.1 ? room : r.heroWidth * 0.3;
      // Smoothstep: eases in, and eases out so the car rolls to a stop instead of hitting a wall.
      const shift = p * p * (3 - 2 * p) * maxShift;
      car.style.setProperty('--car-shift', `${shift.toFixed(1)}px`);
      emit(shift - lastShift);
      lastShift = shift;
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };

    size();
    update();
    addEventListener('resize', size);
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('resize', size);
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas className="hero-smoke" aria-hidden="true" ref={canvasRef} />;
}
