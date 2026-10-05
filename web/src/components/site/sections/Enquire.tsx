'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

const VOLUMES = ['1-10', '11-30', '31-60', '60+'];

// Public "Request an invitation" form. Submissions land in Admin → Enquiries.
export function Enquire() {
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setError('');
    if (!data.name?.trim() || !data.dealership?.trim()) return setError('Please add your name and dealership.');
    if (!/^\S+@\S+\.\S+$/.test(data.email?.trim() ?? '')) return setError('Please enter a valid email address.');
    setState('busy');
    try {
      await api.submitEnquiry(data);
      setState('sent');
      form.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.friendly : 'Something went wrong. Please try again.');
      setState('idle');
    }
  };

  return (
    <section className="enquire section-pad shell" id="enquire" aria-labelledby="enquire-title">
      <div className="enquire-grid">
        <div className="enquire-heading">
          <p className="eyebrow">06 / Not a member yet</p>
          <h2 id="enquire-title" data-reveal="">
            REQUEST AN
            <br />
            <span>INVITATION.</span>
          </h2>
          <p className="body-copy">
            Dealer Review works with a small number of dealerships at a time. Tell us about yours and our team will be in touch to set
            up your private workspace.
          </p>
          <ol className="enquire-steps">
            <li><span>01</span>We review your request, usually within one business day.</li>
            <li><span>02</span>You receive a personal invitation for your dealership.</li>
            <li><span>03</span>Set your password and submit your first vehicle.</li>
          </ol>
        </div>

        <div className="enquire-panel">
          {state === 'sent' ? (
            <div className="enquire-done" role="status" id="enquire-done">
              <i className="ph ph-check-circle" aria-hidden="true"></i>
              <h3>Thank you. Your request is in.</h3>
              <p>We’ll be in touch shortly at the email you gave us. Keep an eye on your inbox, and your spam folder, for your invitation.</p>
              <button className="button outline" type="button" onClick={() => setState('idle')}>Send another request</button>
            </div>
          ) : (
            <form id="enquire-form" onSubmit={submit} noValidate>
              <div className="enquire-fields">
                <label>
                  <span>Your name</span>
                  <input name="name" autoComplete="name" required maxLength={120} />
                </label>
                <label>
                  <span>Dealership</span>
                  <input name="dealership" autoComplete="organization" required maxLength={160} />
                </label>
                <label>
                  <span>Work email</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={200} />
                </label>
                <label>
                  <span>Phone <em>optional</em></span>
                  <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
                </label>
                <label>
                  <span>City, state <em>optional</em></span>
                  <input name="location" autoComplete="address-level2" maxLength={120} />
                </label>
                <label>
                  <span>Vehicles per month <em>optional</em></span>
                  <select name="monthlyVolume" defaultValue="">
                    <option value="">Choose</option>
                    {VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label className="wide">
                  <span>Anything we should know? <em>optional</em></span>
                  <textarea name="message" rows={4} maxLength={2000} />
                </label>
                {/* Honeypot for bots; hidden from people and screen readers. */}
                <label className="enquire-hp" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <p className="enquire-error" role="alert">{error}</p>
              <div className="enquire-actions">
                <button className="button" type="submit" disabled={state === 'busy'}>
                  {state === 'busy' ? 'Sending…' : 'Request an invitation'} <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
                </button>
                <p>We only use these details to contact you about Dealer Review.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
