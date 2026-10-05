'use client';

import { createContext, useCallback, useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/images/logo.png';
import { ApiError, api, type Me } from '@/lib/client/api';
import { Icon } from './icons';
import { age } from './format';

// ---------- Toast ----------
type ToastState = { msg: string; kind: 'ok' | 'error'; key: number } | null;
const ToastContext = createContext<(msg: string, kind?: 'ok' | 'error') => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    clearTimeout(timer.current);
    setToast({ msg, kind, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${toast?.kind === 'error' ? 'error' : ''}`} id="toast" role="status" hidden={!toast} key={toast?.key}>
        {toast && <Icon name={toast.kind === 'error' ? 'alert' : 'check'} />}
        {toast?.msg}
      </div>
    </ToastContext.Provider>
  );
}

// ---------- Drawer ----------
// Slide-in panel with Esc to close, a scrim, and Tab kept inside while open.
export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('#drawer-close')?.focus();
    return () => {
      document.body.style.overflow = '';
      returnTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const f = [...ref.current.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(
      el => !(el as HTMLButtonElement).disabled && el.offsetParent,
    );
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  };
  return (
    <>
      <div className="scrim" id="scrim" onClick={onClose} />
      <aside className="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={ref} onKeyDown={trap}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow" id="drawer-eyebrow">{eyebrow}</p>
            <h3 id="drawer-title">{title}</h3>
          </div>
          <button className="icon-btn" id="drawer-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer-body" id="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot" id="drawer-foot">{footer}</footer>}
      </aside>
    </>
  );
}

// ---------- Lightbox ----------
export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (src) document.querySelector<HTMLElement>('#lightbox-close')?.focus();
  }, [src]);
  if (!src) return null;
  return (
    <div className="lightbox" id="lightbox" onClick={e => (e.target as HTMLElement).tagName !== 'IMG' && onClose()}>
      <button className="icon-btn" id="lightbox-close" aria-label="Close photo" onClick={onClose}>
        <Icon name="close" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed, expiring storage URL */}
      <img src={src} alt="" />
    </div>
  );
}

// Escape closes the photo first, then the drawer.
export function useEscape(handlers: { lightbox: boolean; closeLightbox: () => void; closeDrawer: () => void }) {
  const onEscape = useEffectEvent(() => {
    if (handlers.lightbox) handlers.closeLightbox();
    else handlers.closeDrawer();
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

// ---------- Small pieces ----------
export const SkeletonRows = ({ cols, rows = 5 }: { cols: number; rows?: number }) => (
  <>
    {Array.from({ length: rows }, (_, i) => (
      <tr className="skeleton" key={i}>
        {Array.from({ length: cols }, (_, j) => (
          <td key={j}><span /></td>
        ))}
      </tr>
    ))}
  </>
);

export function AgePill({ since }: { since: string }) {
  const a = age(since);
  return (
    <span className={`pill ${a.level}`}>
      <Icon name={a.level === 'late' ? 'alert' : 'clock'} />
      {a.label}
    </span>
  );
}

export const Wordmark = () => (
  <Link className="wordmark" href="/" aria-label="Dealer Review home">
    <Image src={logo} alt="Dealer Review" sizes="160px" priority />
  </Link>
);

// ---------- Session ----------
export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut'; message?: string }
  | { status: 'signedIn'; me: Me }
  | { status: 'unreachable'; message: string };

// Restores the stored session on load; 401s anywhere call `expire()` to return to sign-in.
// Only a definite 401 forgets the session: a dropped connection or an aborted request
// (e.g. reloading mid-check) must not sign anyone out.
export function useSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const check = useCallback(() => {
    if (!api.isSignedIn()) return setState({ status: 'signedOut' });
    setState({ status: 'loading' });
    api.me().then(
      me => setState({ status: 'signedIn', me }),
      err => {
        if (err instanceof ApiError && err.status === 401) {
          api.forget();
          setState({ status: 'signedOut' });
        } else if (err instanceof ApiError && err.status === 403) {
          // Disabled account or missing profile: show why on the sign-in screen.
          api.forget();
          setState({ status: 'signedOut', message: err.message });
        } else setState({ status: 'unreachable', message: (err as Error).message });
      },
    );
  }, []);
  useEffect(check, [check]);
  const signIn = useCallback((me: Me) => setState({ status: 'signedIn', me }), []);
  const signOut = useCallback(async () => {
    await api.logout();
    setState({ status: 'signedOut' });
  }, []);
  const expire = useCallback(() => {
    api.forget();
    setState({ status: 'signedOut', message: 'Your session ended. Please sign in again.' });
  }, []);
  return { state, signIn, signOut, expire, retry: check, setState };
}

// Shown when the server can't be reached; the session is kept so Retry picks up where it left off.
export function Unreachable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="login">
      <section className="login-side" style={{ gridColumn: '1 / -1' }}>
        <div className="login-card">
          <Wordmark />
          <div>
            <h1>Can’t reach Dealer Review</h1>
            <p className="muted">{message} You’re still signed in.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onRetry}>Try again</button>
        </div>
      </section>
    </main>
  );
}

// ---------- Sign-in screen ----------
export function LoginScreen({
  eyebrow,
  quote,
  title,
  intro,
  emailLabel = 'Email',
  message,
  onSignedIn,
}: {
  eyebrow: string;
  quote: [string, string];
  title: string;
  intro: string;
  emailLabel?: string;
  message?: string;
  onSignedIn: (me: Me) => void;
}) {
  const [error, setError] = useState(message ?? '');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => setError(message ?? ''), [message]);
  useEffect(() => emailRef.current?.focus(), []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const pw = form.elements.namedItem('password') as HTMLInputElement;
    if (!email || !pw.value) return setError('Enter your email and password.');
    setBusy(true);
    setError('');
    try {
      const me = await api.login(email, pw.value);
      pw.value = '';
      onSignedIn(me);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="login-view" className="login">
      <section className="login-art" aria-hidden="true">
        <p className="eyebrow">{eyebrow}</p>
        <p className="login-quote">
          {quote[0]}
          <br />
          <span>{quote[1]}</span>
        </p>
      </section>
      <section className="login-side">
        <form id="login-form" className="login-card" noValidate onSubmit={submit}>
          <Wordmark />
          <div>
            <h1>{title}</h1>
            <p className="muted">{intro}</p>
          </div>
          <label className="field">
            {emailLabel}
            <input id="login-email" name="email" type="email" autoComplete="username" required ref={emailRef} />
          </label>
          <label className="field">
            Password
            <input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </label>
          <p className="form-error" id="login-error" role="alert">{error}</p>
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <a className="hint" href="/reset-password">Forgot your password?</a>
        </form>
      </section>
    </main>
  );
}

// Run a request; on 401 return to sign-in, otherwise hand back the message.
export function useApiErrors(expire: () => void) {
  return useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        expire();
        return '';
      }
      return err instanceof ApiError ? err.friendly : (err as Error).message;
    },
    [expire],
  );
}
