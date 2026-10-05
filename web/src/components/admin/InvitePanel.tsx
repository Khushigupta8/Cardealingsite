'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InvitePrefill } from './EnquiriesPanel';
import { api, type Dealership, type Person, type Role } from '@/lib/client/api';
import { useApiErrors, useToast } from '@/components/console/kit';

const ROLES: { value: Role; title: string; text: string }[] = [
  { value: 'dealer', title: 'Dealer', text: 'One login per dealership. Submits vehicles and sees only their own.' },
  { value: 'reviewer', title: 'Reviewer', text: 'Grades vehicles from every dealership.' },
  { value: 'admin', title: 'Admin', text: 'Everything a reviewer can do, plus invitations.' },
];

// prefill comes from Enquiries → Invite; after a successful invite that enquiry is marked Invited.
export function InvitePanel({ expire, prefill, onUsedPrefill }: { expire: () => void; prefill?: InvitePrefill | null; onUsedPrefill?: () => void }) {
  const toast = useToast();
  const errorText = useApiErrors(expire);
  const [role, setRole] = useState<Role>('dealer');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [dealershipId, setDealershipId] = useState('__new');
  const [dealershipName, setDealershipName] = useState(prefill?.dealershipName ?? '');
  const [open, setOpen] = useState<Dealership[]>([]);
  const [hiddenSome, setHiddenSome] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dealerships, people] = await Promise.all([api.get<Dealership[]>('/admin/dealerships'), api.get<Person[]>('/admin/users')]);
      // "One dealership login": hide dealerships that already have a dealer account.
      const taken = new Set(people.filter(p => p.role === 'dealer').map(p => p.dealership?.id));
      const free = dealerships.filter(d => !taken.has(d.id));
      setOpen(free);
      setHiddenSome(free.length !== dealerships.length);
      setDealershipId(id => (id === '__new' || free.some(d => d.id === id) ? id : '__new'));
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    }
  }, [errorText, toast]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    const body: Record<string, string> = { email: email.trim(), role };
    if (!/^\S+@\S+\.\S+$/.test(body.email)) return setError('Enter a valid email address.');
    if (role === 'dealer') {
      if (dealershipId === '__new') {
        if (!dealershipName.trim()) return setError('Enter the new dealership’s name, or pick an existing one.');
        body.dealershipName = dealershipName.trim();
      } else body.dealershipId = dealershipId;
    }
    setBusy(true);
    try {
      const res = await api.post<{ emailSent: boolean; emailProblem?: string }>('/admin/invitations', body);
      if (prefill && body.email.toLowerCase() === prefill.email.toLowerCase()) {
        await api.patch(`/admin/enquiries/${encodeURIComponent(prefill.enquiryId)}`, { status: 'invited' }).catch(() => {});
        onUsedPrefill?.();
      }
      if (res.emailSent) {
        setOk(`Invitation sent to ${body.email}. They’ll appear under People as Invited.`);
        toast(`Invitation sent to ${body.email}`);
      } else {
        // Added, but Supabase couldn't email them: the admin shares the link instead.
        setError(`${body.email} was added under People, but no email went out. ${res.emailProblem ?? ''}`);
        toast(`${body.email} added. Email not sent`, 'error');
      }
      setEmail('');
      setDealershipName('');
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-panel="invite" aria-labelledby="invite-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Access</p>
          <h2 id="invite-title">Invite someone</h2>
        </div>
      </header>
      <div className="invite-layout">
        <form id="invite-form" className="card form-stack" noValidate onSubmit={submit}>
          <fieldset className="role-cards">
            <legend>Role</legend>
            {ROLES.map(r => (
              <label className="role-card" key={r.value}>
                <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />
                <span><strong>{r.title}</strong><small>{r.text}</small></span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            Email
            <input name="email" type="email" required placeholder="manager@dealership.com" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          {role === 'dealer' && (
            <div className="dealer-fields">
              <label className="field">
                Dealership
                <select name="dealershipId" id="dealership-select" value={dealershipId} onChange={e => setDealershipId(e.target.value)}>
                  <option value="__new">+ New dealership</option>
                  {open.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              {dealershipId === '__new' && (
                <label className="field" id="new-dealership">
                  New dealership name
                  <input name="dealershipName" placeholder="Westfield Motors" autoComplete="off" value={dealershipName} onChange={e => setDealershipName(e.target.value)} />
                </label>
              )}
              {hiddenSome && <p className="hint" id="taken-hint">Dealerships that already have a login are not listed.</p>}
            </div>
          )}
          <p className="form-error" id="invite-error" role="alert">{error}</p>
          <p className="form-ok" id="invite-ok" role="status">{ok}</p>
          <div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button>
          </div>
        </form>
        <aside className="card steps">
          <h3>How it works</h3>
          <ol>
            <li><strong>You send the invite.</strong> The account is created straight away.</li>
            <li><strong>They get an email</strong> with a personal link to set their password.</li>
            <li><strong>They sign in.</strong> Dealers land in their own workspace; reviewers and admins come here.</li>
          </ol>
          <p className="hint">Links expire after 24 hours. Until they activate, people show as <em>Invited</em> under People. If an email doesn’t arrive, use <em>Copy link</em> there.</p>
        </aside>
      </div>
    </section>
  );
}
