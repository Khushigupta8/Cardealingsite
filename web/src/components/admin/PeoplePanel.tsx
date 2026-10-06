'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Dealership, type Person, type Role } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { Drawer, SkeletonRows, useApiErrors, useToast } from '@/components/console/kit';
import { date } from '@/components/console/format';

export function PeoplePanel({ expire, onInvite, meId }: { expire: () => void; onInvite: () => void; meId: string }) {
  const toast = useToast();
  const errorText = useApiErrors(expire);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [role, setRole] = useState<Role | ''>('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [manual, setManual] = useState<{ id: string; url: string } | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  // Two-step: the first click arms the button for a few seconds.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const setDisabled = async (p: Person, disabled: boolean) => {
    if (armed !== p.id) return setArmed(p.id);
    setArmed(null);
    setBusy(b => ({ ...b, [p.id]: 'access' }));
    try {
      await api.patch(`/admin/users/${encodeURIComponent(p.id)}`, { disabled });
      toast(disabled ? `${p.email} can no longer sign in` : `${p.email} can sign in again`);
      await load();
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    } finally {
      setBusy(b => ({ ...b, [p.id]: '' }));
    }
  };

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([api.get<Person[]>('/admin/users'), api.get<Dealership[]>('/admin/dealerships')]);
      setPeople(p);
      setDealerships(d);
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
      setPeople(p => p ?? []);
    }
  }, [errorText, toast]);
  useEffect(() => { load(); }, [load]);

  const needle = q.trim().toLowerCase();
  const rows = (people ?? []).filter(
    p => (!role || p.role === role) && (!needle || [p.email, p.fullName, p.dealership?.name].some(s => s?.toLowerCase().includes(needle))),
  );

  // One-time link the admin passes on directly, for when email is slow or rate limited.
  const copyLink = async (p: Person) => {
    setBusy(b => ({ ...b, [p.id]: 'copy' }));
    try {
      const { url, purpose } = await api.post<{ url: string; purpose: string }>(`/admin/users/${encodeURIComponent(p.id)}/link`);
      try {
        await navigator.clipboard.writeText(url);
        setManual(null);
        toast(`Link to ${purpose} copied for ${p.email}. It works once and expires in 24 hours.`);
      } catch {
        setManual({ id: p.id, url });
      }
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    } finally {
      setBusy(b => ({ ...b, [p.id]: '' }));
    }
  };

  const sendLink = async (p: Person) => {
    setBusy(b => ({ ...b, [p.id]: 'send' }));
    try {
      await api.post(`/admin/users/${encodeURIComponent(p.id)}/send-link`);
      toast(`Link sent to ${p.email}`);
      setBusy(b => ({ ...b, [p.id]: 'sent' }));
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
      setBusy(b => ({ ...b, [p.id]: '' }));
    }
  };

  return (
    <>
      <section data-panel="people" aria-labelledby="people-title">
        <header className="page-head">
          <div>
            <p className="eyebrow">Access</p>
            <h2 id="people-title">People</h2>
          </div>
          <button className="btn btn-primary" onClick={onInvite}>Invite someone</button>
        </header>
        <div className="kpis kpis-3" aria-label="Accounts summary">
          <div className="kpi"><span className="kpi-label">Dealerships</span><span className="kpi-value" data-kpi="dealerships">{people ? dealerships.length : '-'}</span></div>
          <div className="kpi"><span className="kpi-label">Active accounts</span><span className="kpi-value" data-kpi="active">{people ? people.filter(p => p.activatedAt).length : '-'}</span></div>
          <div className="kpi"><span className="kpi-label">Invitations pending</span><span className="kpi-value" data-kpi="invited">{people ? people.filter(p => !p.activatedAt).length : '-'}</span></div>
        </div>
        <div className="toolbar">
          <div className="segmented" role="tablist" aria-label="Role">
            {([['', 'Everyone'], ['dealer', 'Dealers'], ['reviewer', 'Reviewers'], ['admin', 'Admins']] as [Role | '', string][]).map(([r, label]) => (
              <button key={r} role="tab" data-role={r} aria-selected={role === r} onClick={() => setRole(r)}>{label}</button>
            ))}
          </div>
          <label className="search">
            <Icon name="search" />
            <input id="people-search" type="search" placeholder="Search email, name or dealership" aria-label="Search people" value={q} onChange={e => setQ(e.target.value)} />
          </label>
        </div>
        <div className="table-card">
          <table className="list">
            <thead>
              <tr><th>Person</th><th>Role</th><th>Dealership</th><th>Status</th><th>Invited</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody id="people-rows">
              {!people ? (
                <SkeletonRows cols={6} rows={4} />
              ) : (
                rows.map(p => (
                  <tr key={p.id}>
                    <td className="cell-main">
                      <div className="title">{p.fullName || p.email}</div>
                      {p.fullName && <div className="sub">{p.email}</div>}
                    </td>
                    <td data-label="Role"><span className="pill role-pill">{p.role}</span></td>
                    <td data-label="Dealership">{p.dealership?.name || '-'}</td>
                    <td data-label="Status">
                      {p.disabledAt ? (
                        <span className="pill late"><Icon name="alert" />Disabled</span>
                      ) : p.activatedAt ? (
                        <span className="pill ok"><Icon name="check" />Active</span>
                      ) : (
                        <span className="pill warn"><Icon name="clock" />Invited</span>
                      )}
                      {p.role === 'dealer' && p.termsAcceptedAt && (
                        <div className="sub" title="Accepted the membership terms">Terms accepted {date(p.termsAcceptedAt)}</div>
                      )}
                    </td>
                    <td data-label="Invited" className="date">{date(p.invitedAt)}</td>
                    <td className="num row-actions" data-label="">
                      <button className="btn btn-sm" data-copy-link={p.id} disabled={!!busy[p.id] && busy[p.id] !== 'sent'} title="Copy a one-time sign-in link to send yourself (no email)" onClick={() => copyLink(p)}>
                        Copy link
                      </button>{' '}
                      <button className="btn btn-sm" data-send-link={p.id} disabled={!!busy[p.id]} title={p.activatedAt ? 'Email a link to choose a new password' : 'Email a new link to set their password'} onClick={() => sendLink(p)}>
                        {busy[p.id] === 'send' ? 'Sending…' : busy[p.id] === 'sent' ? 'Sent' : p.activatedAt ? 'Send reset link' : 'Resend invite'}
                      </button>
                      {p.id !== meId && (
                        <>
                          {' '}
                          <button
                            className="btn btn-sm"
                            data-access={p.id}
                            disabled={busy[p.id] === 'access'}
                            style={armed === p.id ? { borderColor: 'var(--accent)', color: '#fff', background: 'var(--accent)' } : undefined}
                            onClick={() => setDisabled(p, !p.disabledAt)}
                          >
                            {armed === p.id ? (p.disabledAt ? 'Confirm enable' : 'Confirm disable') : p.disabledAt ? 'Enable' : 'Disable'}
                          </button>
                        </>
                      )}
                      {p.role === 'dealer' && p.dealership && (
                        <>
                          {' '}
                          <button className="btn btn-sm btn-danger" data-delete-dealership={p.dealership.id} onClick={() => setRemoving(p.dealership)}>
                            Delete
                          </button>
                        </>
                      )}
                      {manual?.id === p.id && <input className="link-out" readOnly value={manual.url} aria-label="Sign-in link" onFocus={e => e.target.select()} autoFocus />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {people && !rows.length && (
            <div className="empty" id="people-empty">
              {needle || role ? <><strong>No one matches</strong>Try a different search or role.</> : <><strong>No accounts yet</strong>Invite your first dealership to get started.</>}
            </div>
          )}
        </div>
      </section>
      <DeleteDealership
        key={removing?.id ?? 'closed'}
        dealership={removing}
        people={(people ?? []).filter(p => removing && p.dealership?.id === removing.id)}
        onClose={() => setRemoving(null)}
        onDeleted={() => { setRemoving(null); load(); }}
        errorText={errorText}
      />
    </>
  );
}

// Permanent removal of a dealership and everything in it. Typing the name guards against slips.
// Keyed by dealership, so the typed confirmation starts empty each time.
function DeleteDealership({
  dealership,
  people,
  onClose,
  onDeleted,
  errorText,
}: {
  dealership: { id: string; name: string } | null;
  people: Person[];
  onClose: () => void;
  onDeleted: () => void;
  errorText: (err: unknown) => string | null;
}) {
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = !!dealership && typed.trim().toLowerCase() === dealership.name.trim().toLowerCase();

  const remove = async () => {
    if (!dealership || !matches) return;
    setBusy(true);
    try {
      const r = await api.del<{ accounts: number; vehicles: number; photos: number; filesLeft: number }>(
        `/admin/dealerships/${encodeURIComponent(dealership.id)}`,
      );
      toast(
        `${dealership.name} deleted: ${r.accounts} account${r.accounts === 1 ? '' : 's'}, ${r.vehicles} vehicle${r.vehicles === 1 ? '' : 's'}, ${r.photos} photo${r.photos === 1 ? '' : 's'}` +
          (r.filesLeft ? `. ${r.filesLeft} photo files couldn’t be removed from storage.` : ''),
      );
      onDeleted();
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={!!dealership}
      onClose={busy ? () => {} : onClose}
      eyebrow="Delete dealership"
      title={dealership?.name ?? ''}
      footer={
        <>
          <label className="field">
            Type <strong>{dealership?.name}</strong> to confirm
            <input id="delete-confirm" autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => e.key === 'Enter' && remove()} />
          </label>
          <button className="btn btn-lg btn-danger" id="delete-dealership" disabled={!matches || busy} onClick={remove}>
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </>
      }
    >
      <div className="notice">
        <Icon name="alert" />
        <div>This can’t be undone. Everything below is removed from the database straight away.</div>
      </div>
      <ul className="delete-list">
        <li>
          {people.length} sign-in account{people.length === 1 ? '' : 's'}
          {people.length > 0 && `: ${people.map(p => p.email).join(', ')}`}. They can no longer sign in.
        </li>
        <li>Every vehicle the dealership submitted, with its photos, review results, reports and messages</li>
        <li>Its membership: any active subscription is cancelled in Stripe first, so they aren’t billed again</li>
      </ul>
      <p className="field-note">Past Stripe invoices stay in Stripe for your records. Website enquiries aren’t affected.</p>
    </Drawer>
  );
}
