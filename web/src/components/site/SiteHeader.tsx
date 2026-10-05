'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import logo from '@/assets/images/logo.png';

// Sticky header: mobile menu, "scrolled" style and the reading-progress bar.
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progress = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let queued = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress.current) progress.current.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 0}%`;
      setScrolled(scrollY > 24);
      queued = false;
    };
    // Quiet scroll feedback: never intercept or change natural scrolling.
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <a className="brand-logo" href="#" aria-label="Dealer Review home">
        <Image src={logo} alt="Dealer Review" sizes="150px" priority />
      </a>
      <nav id="main-nav" aria-label="Main navigation" className={open ? 'open' : undefined} onClick={e => (e.target as HTMLElement).closest('a,button') && setOpen(false)}>
        <a href="#approach">The service</a>
        <a href="#report">Your report</a>
        <a href="#membership">Membership</a>
        <a href="#questions">FAQs</a>
        <a href="#enquire" className="nav-invite">
          Request an invitation
        </a>
      </nav>
      <div className="header-actions">
        <a className="button small header-invite" href="#enquire">
          Request invitation <i className="ph ph-arrow-down-right" aria-hidden="true"></i>
        </a>
        <button className="button outline small" data-modal="signin">
          Dealer login <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
        </button>
        <button
          ref={toggle}
          className="menu-toggle"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(o => !o)}
        >
          <i className="ph ph-list" aria-hidden="true"></i>
        </button>
      </div>
      <div className="reading-progress" aria-hidden="true" ref={progress}></div>
    </header>
  );
}
