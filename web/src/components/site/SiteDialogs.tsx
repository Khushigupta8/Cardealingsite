'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { api } from '@/lib/client/api';
import graySuv from '@/assets/images/gray-suv.jpg';

export type SampleVehicle = { name: string; trim: string; date: string; image: StaticImageData };
type DialogState =
  | { kind: 'signin' | 'activate' | 'membership' | 'support' }
  | { kind: 'report'; vehicle?: SampleVehicle }
  | { kind: 'sample'; vehicle: SampleVehicle; status: 'Pending' | 'Needs info' };

const DialogContext = createContext<(d: DialogState) => void>(() => {});
export const useSiteDialog = () => useContext(DialogContext);

// One dialog for the whole marketing page. Any element with data-modal="signin|activate|membership|support",
// data-report, or id="sample-report" opens it, so the sections can stay server-rendered.
export function SiteDialogs({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Invitation / reset links that land on the homepage go to the page that handles them.
    const hash = location.hash.slice(1);
    if (/(^|&)(access_token|error_description)=/.test(hash)) {
      const type = new URLSearchParams(hash).get('type');
      location.replace((type === 'recovery' ? '/reset-password' : '/activate') + location.hash);
    }

    const open = (t: HTMLElement) => {
      const modal = t.closest<HTMLElement>('[data-modal]');
      if (modal) return setState({ kind: modal.dataset.modal as 'signin' });
      if (t.closest('[data-report], #sample-report')) setState({ kind: 'report' });
    };
    const onClick = (e: MouseEvent) => open(e.target as HTMLElement);
    document.addEventListener('click', onClick);
    // Open whatever was tapped before this ran (recorded by the inline script in the layout).
    const w = window as Window & { __siteDialogs?: boolean; __earlyDialog?: HTMLElement };
    w.__siteDialogs = true;
    if (w.__earlyDialog?.isConnected) open(w.__earlyDialog);
    w.__earlyDialog = undefined;
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (state && !d.open) d.showModal();
    if (!state && d.open) d.close();
  }, [state]);

  const close = () => setState(null);
  const backdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  };

  return (
    <DialogContext.Provider value={setState}>
      {children}
      <dialog id="dialog" aria-label="Dealer Review" ref={ref} onClose={close} onClick={backdrop} className={state?.kind === 'report' ? 'report-dialog' : undefined}>
        <button className="close-dialog" aria-label="Close dialog" onClick={close}>
          <i className="ph ph-x" aria-hidden="true"></i>
        </button>
        <div id="dialog-content">{state && <Content state={state} close={close} />}</div>
      </dialog>
    </DialogContext.Provider>
  );
}

const Kicker = () => <p className="eyebrow">Dealer Review / Private access</p>;

function Content({ state, close }: { state: DialogState; close: () => void }) {
  switch (state.kind) {
    case 'signin':
      return <SignIn />;
    case 'activate':
      return (
        <>
          <Kicker />
          <h2>Your invitation awaits.</h2>
          <p>Open the invitation email sent to your dealership and follow your personal activation link to set a password and start your membership.</p>
          <p>Links work once and expire after 24 hours. If yours has expired or is missing, you can get a new one straight away.</p>
          <a className="button" href="/activate">Get a new link</a>
          <p className="dialog-note">
            No invitation yet?{' '}
            <a href="#enquire" onClick={close}>
              Request one
            </a>
          </p>
        </>
      );
    case 'membership':
      return (
        <>
          <Kicker />
          <h2>Built around your dealership.</h2>
          <p>One membership. A private place to submit vehicles and receive considered guidance from our team.</p>
          <ul className="modal-list">
            <li>Expert listing recommendations from your condition rating</li>
            <li>Branded, downloadable vehicle reports</li>
            <li>One private login for your dealership</li>
            <li>Membership and invoices managed through Stripe</li>
          </ul>
          <p className="dialog-note">Membership pricing and billing frequency will be confirmed before activation.</p>
          <button className="button" data-modal="signin">Dealer sign in</button>
        </>
      );
    case 'support':
      return (
        <>
          <Kicker />
          <h2>Here to help.</h2>
          <p>Questions about a vehicle review? Open the vehicle in your workspace and message your reviewer. The conversation stays with the car.</p>
          <p>Locked out? <a href="/reset-password">Reset your password</a> or <a href="/activate">get a new invitation link</a>. Billing, invoices and payment details are in <strong>Manage billing</strong> in your workspace.</p>
          <button className="button" data-modal="signin">Return to sign in</button>
        </>
      );
    case 'sample':
      return (
        <>
          <p className="eyebrow">Sample vehicle / {state.status}</p>
          <h2>{state.vehicle.name}</h2>
          <p>{state.vehicle.trim}</p>
          <p>
            {state.status === 'Needs info'
              ? 'Your reviewer has requested additional rear interior photos. Sign in to your dealership portal to upload them.'
              : 'Your vehicle is in the review queue. Your dealership will receive an email when the review is complete.'}
          </p>
          <button className="button" data-modal="signin">Dealer sign in</button>
        </>
      );
    case 'report': {
      const v = state.vehicle ?? { name: '2022 Porsche Macan', image: graySuv, trim: '', date: '' };
      const price = v.name.includes('BMW') ? '$28,500' : '$39,500';
      return (
        <>
          <p className="eyebrow">Dealer Review / Sample valuation report</p>
          <h2>{v.name}</h2>
          <p>Prepared for Westfield Motors · October 1, 2026</p>
          <Image src={v.image} alt={v.name} sizes="(max-width: 700px) 100vw, 640px" />
          <div className="report-data">
            <div><span>Condition rating</span><strong>4 / 5</strong></div>
            <div><span>Recommended listing</span><strong>{price}</strong></div>
          </div>
          <h3>Reviewer notes</h3>
          <p>Well presented with minor interior wear consistent with mileage. Clean exterior and a tidy cabin.</p>
          <p>Reviewed by Devon · Sample data for demonstration.</p>
          <div className="report-actions">
            <button className="button" id="print-report" onClick={() => window.print()}>
              Print / Save PDF <i className="ph ph-download-simple" aria-hidden="true"></i>
            </button>
            <button className="button secondary" id="close-report" onClick={close}>Close report</button>
          </div>
        </>
      );
    }
  }
}

// Real sign-in. Dealers go to /portal, the review team to /admin.
function SignIn() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const pw = form.elements.namedItem('password') as HTMLInputElement;
    setMessage('');
    setBusy(true);
    try {
      const me = await api.login(email, pw.value);
      location.href = me.role === 'dealer' ? '/portal' : '/admin';
    } catch (err) {
      setMessage((err as Error).message);
      pw.value = '';
      setBusy(false);
    }
  };
  return (
    <>
      <Kicker />
      <h2>Welcome back.</h2>
      <p>Your vehicles. Your reviews. One place.</p>
      <form id="access-form" onSubmit={submit}>
        <label htmlFor="email">Dealership email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@dealership.com" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        <button className="button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="form-message" aria-live="polite">{message}</p>
      </form>
      <p className="dialog-note">
        <a href="/reset-password">Forgot your password?</a> · Lost your invitation? <a href="/activate">Get a new link</a>
      </p>
    </>
  );
}
