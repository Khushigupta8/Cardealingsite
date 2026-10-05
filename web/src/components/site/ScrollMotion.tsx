'use client';

import { useEffect } from 'react';

// Content that rises into view. Siblings matched by the same selector stagger one after another.
// "left"/"right" slide in from that side instead of rising.
const REVEALS: [selector: string, variant?: 'left' | 'right'][] = [
  ['main section:not(.hero) .eyebrow'],
  ['.section-description'],
  ['.body-copy'],
  ['.feature-panel:first-child', 'left'],
  ['.feature-panel:last-child', 'right'],
  ['.cinema-screen'],
  ['.cinema-footer'],
  ['.submission-specs>div'],
  ['.review-handoff'],
  ['.submission-console', 'right'],
  ['.assessment-card'],
  ['.report-strip'],
  ['.status-explainer>*'],
  ['.interaction-hint'],
  ['.portal-grid>*:last-child', 'right'],
  ['.review-thread', 'right'],
  ['.thread-return'],
  ['.editorial-content>p'],
  ['.privacy-grid article'],
  ['.membership-heading .button'],
  ['.membership-ledger', 'right'],
  ['.ledger-item'],
  ['.billing-details'],
  ['.enquire-steps li'],
  ['.enquire-panel', 'right'],
  ['.faq-list>*'],
  ['.closing-copy .button'],
  ['.closing-copy>p'],
  ['.closing-image', 'right'],
];

// Images drift inside their frames as they pass through the viewport. `amt` is the share of the
// frame's height they travel each way; `scale` gives them enough bleed that no edge shows.
const PARALLAX = [
  { sel: '.feature-panel>img, .closing-image>img, .card-image img, .submission-console>img', amt: 0.07, scale: 1.16 },
  { sel: '.editorial-image>img', amt: 0.14, scale: 1.32 },
];

// Big headlines slide sideways with the scroll, in px each way.
const DRIFT = [
  { sel: '.editorial-content h2', x: -60 },
  { sel: '.closing-copy h2>span', x: 50 },
];

// Gives the homepage scroll-driven motion: reveals, parallax images, and drifting headlines.
export function ScrollMotion() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ---- Reveals ----
    // A heading hidden by its own clip-path never counts as intersecting, so its parent is watched for it.
    const stand = new Map<Element, Element>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = stand.get(entry.target) ?? entry.target;
          el.classList.add('m-in', 'revealed');
          el.classList.remove('m-pending', 'reveal-pending');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    // Anything already on screen at load stays put, so nothing blinks out and back.
    const offscreen = (el: Element) => el.getBoundingClientRect().top > innerHeight;
    const tagged = new Set<Element>();
    for (const [selector, variant] of REVEALS) {
      const perParent = new Map<Element | null, number>();
      document.querySelectorAll<HTMLElement>(selector).forEach(el => {
        if (el.closest('dialog') || tagged.has(el) || !offscreen(el)) return;
        tagged.add(el);
        const i = perParent.get(el.parentElement) ?? 0;
        perParent.set(el.parentElement, i + 1);
        el.style.setProperty('--d', `${Math.min(i, 6) * 90}ms`);
        if (variant) el.dataset.motion = variant;
        el.classList.add('m-pending');
        observer.observe(el);
      });
    }
    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (!offscreen(el)) return;
      el.classList.add('reveal-pending');
      const watch = el.parentElement ?? el;
      stand.set(watch, el);
      observer.observe(watch);
    });

    // ---- Scroll-linked layers ----
    const layers = PARALLAX.flatMap(({ sel, amt, scale }) =>
      [...document.querySelectorAll<HTMLElement>(sel)].map(el => {
        el.style.scale = String(scale);
        el.classList.add('m-parallax');
        return { el, frame: el.parentElement ?? el, amt };
      }),
    );
    const drifts = DRIFT.flatMap(({ sel, x }) => [...document.querySelectorAll<HTMLElement>(sel)].map(el => ({ el, x })));

    // -1 when the box is just below the viewport, 0 when centred, 1 when just above.
    const progress = (box: DOMRect) => {
      const span = (innerHeight + box.height) / 2;
      return Math.max(-1, Math.min(1, (innerHeight / 2 - (box.top + box.height / 2)) / span));
    };
    const visible = (box: DOMRect) => box.bottom > -100 && box.top < innerHeight + 100;

    let queued = false;
    const update = () => {
      queued = false;
      for (const { el, frame, amt } of layers) {
        const box = frame.getBoundingClientRect();
        if (visible(box)) el.style.translate = `0 ${(progress(box) * box.height * amt).toFixed(1)}px`;
      }
      for (const { el, x } of drifts) {
        const box = el.getBoundingClientRect();
        if (!visible(box)) continue;
        // Never drift further than the margin beside the headline, so narrow screens don't clip it.
        const shift = parseFloat(el.style.translate) || 0;
        const room = Math.max(0, Math.min(box.left - shift, innerWidth - (box.right - shift)) - 8);
        const reach = Math.sign(x) * Math.min(Math.abs(x), room);
        el.style.translate = `${(progress(box) * reach).toFixed(1)}px 0`;
      }
    };
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    return () => {
      observer.disconnect();
      document.querySelectorAll('.m-pending, .reveal-pending').forEach(el => el.classList.remove('m-pending', 'reveal-pending'));
      removeEventListener('scroll', queue);
      removeEventListener('resize', queue);
    };
  }, []);

  return null;
}
