'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Me, type Membership, type Status, type Vehicle, type VehicleList } from '@/lib/client/api';
import { MembershipCard } from './MembershipCard';
import { Icon } from '@/components/console/icons';
import { LoginScreen, SkeletonRows, ToastProvider, Unreachable, Wordmark, useApiErrors, useSession, useToast } from '@/components/console/kit';
import { date, miles, money, vehicleName } from '@/components/console/format';
import { SubmitDrawer, VehicleDrawer } from './drawers';
import { NotificationBell, UnreadBadge, useUnreadChanged } from '@/components/console/Notifications';

const STATUS_PILL: Record<Status, React.ReactNode> = {
  pending: <span className="pill"><Icon name="clock" />In review</span>,
  needs_info: <span className="pill warn"><Icon name="alert" />Needs info</span>,
  completed: <span className="pill ok"><Icon name="check" />Completed</span>,
};
const EMPTY: Record<Status, [string, string]> = {
  pending: ['Nothing in review', 'Vehicles you submit wait here until a reviewer completes them.'],
  needs_info: ['Nothing needs your attention', 'If a reviewer asks for more detail, the vehicle appears here.'],
  completed: ['No completed reviews yet', 'Finished reviews, with grades and recommended prices, appear here.'],
};

export function DealerWorkspace() {
  const { state, signIn, signOut, expire, retry } = useSession();

  // The review team has its own console.
  useEffect(() => {
    if (state.status === 'signedIn' && state.me.role !== 'dealer') window.location.replace('/admin');
  }, [state]);

  if (state.status === 'loading' || (state.status === 'signedIn' && state.me.role !== 'dealer')) return null;
  if (state.status === 'unreachable') return <Unreachable message={state.message} onRetry={retry} />;
  if (state.status === 'signedOut') {
    return (
      <LoginScreen
        eyebrow="Dealer Review / Dealer workspace"
        quote={['YOUR VEHICLES.', 'YOUR REVIEWS.']}
        title="Dealer sign in"
        intro="Your vehicles. Your reviews. One place."
        emailLabel="Dealership email"
        message={state.message}
        onSignedIn={signIn}
      />
    );
  }
  return (
    <ToastProvider>
      <Workspace me={state.me} onSignOut={signOut} expire={expire} />
    </ToastProvider>
  );
}

function Workspace({ me, onSignOut, expire }: { me: Me; onSignOut: () => void; expire: () => void }) {
  const errorText = useApiErrors(expire);
  const [status, setStatus] = useState<Status>('pending');
  const [q, setQ] = useState('');
  const [data, setData] = useState<VehicleList | null>(null);
  const [needs, setNeeds] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const toast = useToast();

  // Membership: load it, and refresh from Stripe when returning from Checkout.
  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get('billing');
    if (back) history.replaceState(null, '', window.location.pathname);
    const req = back === 'success' ? api.post<Membership>('/billing/sync') : api.get<Membership>('/billing');
    req.then(
      m => {
        setMembership(m);
        if (back === 'success') toast(m.active ? 'Membership active. Thank you!' : 'Payment received. Your membership will activate shortly.');
      },
      () => {},
    );
    if (back === 'cancelled') toast('Checkout cancelled. Nothing was charged.', 'error');
  }, [toast]);
  const canSubmit = !membership || membership.active;

  useEffect(() => {
    document.title = `${me.dealership?.name || 'Dealer'} · Dealer Review`;
  }, [me]);

  // Each load gets a ticket; a slower, older load (e.g. the previous tab) must not overwrite a newer one.
  const ticket = useRef(0);
  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setError('');
    const params = new URLSearchParams({ status, limit: '100' });
    if (q.trim()) params.set('q', q.trim());
    try {
      const [list, n] = await Promise.all([api.get<VehicleList>(`/vehicles?${params}`), api.get<VehicleList>('/vehicles?status=needs_info&limit=5')]);
      if (mine !== ticket.current) return;
      setData(list);
      setNeeds(n.items);
    } catch (err) {
      const msg = errorText(err);
      if (msg) setError(msg);
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, [status, q, errorText]);
  // New or newly read messages change the row badges.
  useUnreadChanged(load);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const switchStatus = (s: Status) => {
    // Re-clicking the current tab would clear the list without triggering a reload.
    if (s === status) return;
    setLoading(true);
    setData(d => (d ? { ...d, items: [] } : d));
    setStatus(s);
  };

  const counts = data?.counts;
  const items = data?.items ?? [];
  const none = counts && !counts.pending && !counts.needs_info && !counts.completed;

  const rowKeys = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    const row = e.currentTarget;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(id); }
    if (e.key === 'ArrowDown') { e.preventDefault(); (row.nextElementSibling as HTMLElement)?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (row.previousElementSibling as HTMLElement)?.focus(); }
  };

  return (
    <div id="app-view">
      <header className="portal-bar">
        <Wordmark />
        <div className="dealer-name">
          <span className="eyebrow">Dealer workspace</span>
          <strong id="dealership-name">{me.dealership?.name || 'Your dealership'}</strong>
        </div>
        <div className="bar-actions">
          <span className="bar-email" id="who-email">{me.email}</span>
          <NotificationBell from="team" onOpen={setOpenId} />
          <button className="icon-btn" id="logout" aria-label="Sign out" title="Sign out" onClick={onSignOut}><Icon name="out" /></button>
        </div>
      </header>

      <main className="main">
        <header className="page-head">
          <div>
            <p className="eyebrow">Your vehicles</p>
            <h2 id="greeting">{me.fullName ? `Welcome back, ${me.fullName.split(' ')[0]}` : 'Your workspace'}</h2>
          </div>
          <button
            className="btn btn-primary btn-lg"
            id="new-vehicle"
            disabled={!canSubmit}
            title={canSubmit ? undefined : 'Activate your membership to submit vehicles'}
            onClick={() => setSubmitting(true)}
          >
            <Icon name="plus" />Submit a vehicle
          </button>
        </header>

        {membership && <MembershipCard m={membership} errorText={errorText} />}

        {!!needs.length && (
          <div className="action-banner" id="action-banner">
            <strong><Icon name="alert" />{counts?.needs_info === 1 ? 'A reviewer needs something from you' : `Reviewers need something on ${counts?.needs_info ?? needs.length} vehicles`}</strong>
            {needs.map(v => (
              <div className="action-item" key={v.id}>
                <div><b>{vehicleName(v)}</b><p>“{v.infoRequest}”</p></div>
                <button className="btn btn-sm" data-open={v.id} onClick={() => setOpenId(v.id)}>Respond</button>
              </div>
            ))}
          </div>
        )}

        <div className="toolbar">
          <div className="segmented" role="tablist" aria-label="Status">
            {(['pending', 'needs_info', 'completed'] as Status[]).map(s => (
              <button key={s} role="tab" data-status={s} aria-selected={status === s} onClick={() => switchStatus(s)}>
                {{ pending: 'Pending', needs_info: 'Needs info', completed: 'Completed' }[s]} <span data-count={s}>{counts?.[s] ?? 0}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <Icon name="search" />
            <input id="search" type="search" placeholder="Search your inventory" aria-label="Search your vehicles" value={q} onChange={e => setQ(e.target.value)} />
          </label>
        </div>

        <div className="table-card">
          <table className="list">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>VIN</th>
                <th className="num">Mileage</th>
                <th className="num" id="price-col">{status === 'completed' ? 'Recommended' : 'Asking'}</th>
                <th id="date-col">{status === 'completed' ? 'Completed' : 'Submitted'}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="vehicle-rows">
              {loading && !items.length ? (
                <SkeletonRows cols={6} rows={4} />
              ) : (
                items.map(v => (
                  <tr key={v.id} className={`clickable${v.id === openId ? ' active' : ''}`} data-id={v.id} tabIndex={0} aria-label={`Open ${vehicleName(v)}`} onClick={() => setOpenId(v.id)} onKeyDown={e => rowKeys(e, v.id)}>
                    <td className="cell-main"><div className="title">{vehicleName(v)}<UnreadBadge n={v.unread} /></div><div className="sub">{v.trim || '-'}</div></td>
                    <td className="mono" data-label="VIN">{v.vin}</td>
                    <td className="num" data-label="Mileage">{miles(v.mileage)}</td>
                    <td className="num" data-label={status === 'completed' ? 'Recommended' : 'Asking'}>{status === 'completed' ? money(v.review?.recommendedPrice) : money(v.askingPrice)}</td>
                    <td data-label={status === 'completed' ? 'Completed' : 'Submitted'} className="date">{date(status === 'completed' ? v.completedAt : v.submittedAt)}</td>
                    <td data-label="Status">{STATUS_PILL[v.status]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && !error && !items.length && (
            <div className="empty" id="vehicles-empty">
              {q.trim() ? (
                <><strong>No matches for “{q.trim()}”</strong>Try a make, model, trim or part of the VIN.</>
              ) : none ? (
                <>
                  <strong>Submit your first vehicle</strong>
                  {canSubmit
                    ? 'Add the VIN, mileage, notes and photos. Our team returns a condition grade and a recommended listing price.'
                    : 'Once your membership is active you can add the VIN, mileage, notes and photos here.'}
                  {canSubmit && (
                    <>
                      <br /><br />
                      <button className="btn btn-primary" data-new onClick={() => setSubmitting(true)}><Icon name="plus" />Submit a vehicle</button>
                    </>
                  )}
                </>
              ) : (
                <><strong>{EMPTY[status][0]}</strong>{EMPTY[status][1]}</>
              )}
            </div>
          )}
          {error && (
            <div className="banner-error" id="vehicles-error">
              <span>{error}</span>
              <button className="btn btn-sm" id="retry" onClick={load}>Try again</button>
            </div>
          )}
        </div>
      </main>

      <SubmitDrawer
        open={submitting}
        onClose={() => setSubmitting(false)}
        errorText={errorText}
        onCreated={id => {
          setSubmitting(false);
          if (status !== 'pending') switchStatus('pending');
          else load();
          setOpenId(id);
        }}
      />
      <VehicleDrawer id={openId} onClose={() => setOpenId(null)} errorText={errorText} onChanged={load} />
    </div>
  );
}
