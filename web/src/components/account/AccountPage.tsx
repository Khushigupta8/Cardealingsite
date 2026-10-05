'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, api, type Me } from '@/lib/client/api';
import { Wordmark } from '@/components/console/kit';

// Activation and reset-password pages. Supabase sends people here with their session in the
// URL fragment (#access_token=…&refresh_token=…&type=invite|recovery) or an error.
type View =
  | { name: 'loading' }
  | { name: 'form'; me: Me; firstTime: boolean }
  | { name: 'expired'; title: string; intro: string }
  | { name: 'done'; me: Me };

const home = (me: Me) => (me.role === 'dealer' ? '/portal' : '/admin');
const EXPIRED = { title: 'This link has expired', intro: 'Links work once and expire after 24 hours. Enter your email and we’ll send a new one.' };

export function AccountPage({ mode }: { mode: 'activate' | 'reset' }) {
  const [view, setView] = useState<View>({ name: 'loading' });
  // The link's fragment, read once: the address bar is cleared straight after, and React can
  // run this effect twice (development), which must not lose the tokens or the error.
  const fragment = useRef<string | null>(null);

  useEffect(() => {
    fragment.current ??= window.location.hash;
    const hash = new URLSearchParams(fragment.current.slice(1));
    // Get the tokens out of the address bar (and browser history) straight away.
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);

    if (hash.get('error') || hash.get('error_description')) return setView({ name: 'expired', ...EXPIRED });
    if (!hash.get('access_token')) {
      return setView(
        mode === 'reset'
          ? { name: 'expired', title: 'Reset your password', intro: 'Enter your email and we’ll send you a link to choose a new password.' }
          : { name: 'expired', title: 'Open the link from your email', intro: 'This page needs the personal link from your invitation email. If it has expired, we can send a new one.' },
      );
    }
    api.setSession({ accessToken: hash.get('access_token')!, refreshToken: hash.get('refresh_token') ?? '', expiresAt: Number(hash.get('expires_at')) || null });
    api.me().then(
      me => setView({ name: 'form', me, firstTime: !me.activatedAt }),
      err => {
        api.forget();
        const offline = !(err instanceof ApiError) || err.status === 0;
        setView(offline ? { name: 'expired', title: 'Can’t reach Dealer Review', intro: 'Check your connection and open the link from your email again.' } : { name: 'expired', ...EXPIRED });
      },
    );
  }, [mode]);

  return (
    <main className="login">
      <section className="login-art" aria-hidden="true">
        <p className="eyebrow">Dealer Review / Private access</p>
        <p className="login-quote">YOUR VEHICLES.<br /><span>YOUR REVIEWS.</span></p>
      </section>
      <section className="login-side">
        <div className="login-card">
          <Wordmark />
          {view.name === 'loading' && <div data-state="loading"><p className="muted">Checking your link…</p></div>}
          {view.name === 'form' && <PasswordForm me={view.me} firstTime={view.firstTime} onDone={me => setView({ name: 'done', me })} onExpired={() => setView({ name: 'expired', ...EXPIRED })} />}
          {view.name === 'expired' && <Expired title={view.title} intro={view.intro} />}
          {view.name === 'done' && (
            <div data-state="done" className="account-form">
              <div>
                <h1>You’re all set</h1>
                <p className="muted">{view.me.role === 'dealer' ? 'Opening your dealership workspace…' : 'Opening the review console…'}</p>
              </div>
              <a className="btn btn-primary btn-lg" href={home(view.me)}>Continue</a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PasswordForm({ me, firstTime, onDone, onExpired }: { me: Me; firstTime: boolean; onDone: (me: Me) => void; onExpired: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState(me.fullName ?? '');
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const needsTerms = firstTime && me.role === 'dealer';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => firstField.current?.focus(), []);

  const longEnough = password.length >= 10;
  const mixed = /[a-z]/i.test(password) && /\d/.test(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!longEnough) return setError('Use at least 10 characters.');
    if (!mixed) return setError('Use a mix of letters and numbers.');
    if (password !== confirm) return setError('The two passwords don’t match.');
    if (needsTerms && !agreed) return setError('Please accept the membership terms to continue.');
    setBusy(true);
    try {
      if (firstTime) await api.post('/auth/activate', { password, fullName: name.trim() || undefined, acceptTerms: needsTerms ? agreed : undefined });
      else await api.post('/auth/password', { password });
      // A password change ends the link's session, so sign in fresh with the new password.
      await api.login(me.email, password);
      onDone(me);
      setTimeout(() => window.location.assign(home(me)), 1200);
    } catch (err) {
      const e2 = err as { status?: number; friendly?: string; message: string };
      if (e2.status === 401) return onExpired();
      setError(e2.friendly || e2.message);
      setBusy(false);
    }
  };

  return (
    <form data-state="form" id="password-form" className="account-form" noValidate onSubmit={submit}>
      <div>
        <p className="eyebrow" id="form-eyebrow">{me.dealership?.name || (me.role === 'dealer' ? 'Dealer account' : `${me.role} account`)}</p>
        <h1 id="form-title">{firstTime ? 'Welcome. Set your password.' : 'Choose a new password'}</h1>
        <p className="muted" id="form-intro">{firstTime ? `You’ll use it with ${me.email} to sign in.` : `For ${me.email}.`}</p>
      </div>
      {firstTime && (
        <label className="field" id="name-field">
          <span>Your name <span className="optional">(optional)</span></span>
          <input id="full-name" autoComplete="name" maxLength={120} value={name} onChange={e => setName(e.target.value)} ref={firstField} />
        </label>
      )}
      <label className="field">
        New password
        <span className="pw-wrap">
          <input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} required aria-describedby="pw-rules" value={password} onChange={e => setPassword(e.target.value)} ref={firstTime ? undefined : firstField} />
          <button type="button" className="pw-toggle" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(s => !s)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      <ul className="pw-rules" id="pw-rules">
        <li className={longEnough ? 'met' : ''}>At least 10 characters</li>
        <li className={mixed ? 'met' : ''}>Letters and numbers</li>
      </ul>
      <label className="field">
        Confirm password
        <input id="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
      </label>
      {needsTerms && (
        <label className="terms-check">
          <input type="checkbox" id="accept-terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener">
              membership terms
            </a>
            .
          </span>
        </label>
      )}
      <p className="form-error" id="form-error" role="alert">{error}</p>
      <button className="btn btn-primary btn-lg" type="submit" id="submit-btn" disabled={busy}>
        {firstTime ? 'Set password and continue' : 'Save new password'}
      </button>
    </form>
  );
}

function Expired({ title, intro }: { title: string; intro: string }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      await api.requestPasswordReset(email.trim());
      setOk('If that email has an account, a new link is on its way. Check your inbox and spam folder.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-state="expired" className="account-form">
      <div>
        <h1 id="expired-title">{title}</h1>
        <p className="muted" id="expired-intro">{intro}</p>
      </div>
      <form id="resend-form" className="account-form" noValidate onSubmit={submit}>
        <label className="field">
          Email
          <input id="resend-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </label>
        <p className="form-error" id="resend-error" role="alert">{error}</p>
        <p className="form-ok" id="resend-ok" role="status">{ok}</p>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>Email me a new link</button>
      </form>
      <p className="hint">Still stuck? Ask the person who invited you to send a new link.</p>
    </div>
  );
}
