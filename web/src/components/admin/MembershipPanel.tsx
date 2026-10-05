'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type AdminSettings, type DealershipMembership } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { SkeletonRows, useApiErrors, useToast } from '@/components/console/kit';
import { date } from '@/components/console/format';

function StatusPill({ d, required }: { d: DealershipMembership; required: boolean }) {
  if (d.exempt) return <span className="pill ok"><Icon name="check" />Complimentary</span>;
  if (d.inGrace) return <span className="pill warn"><Icon name="alert" />Payment failed · grace until {date(d.graceEndsAt)}</span>;
  if (d.status === 'active' || d.status === 'trialing')
    return <span className="pill ok"><Icon name="check" />{d.cancelAtPeriodEnd ? `Cancels ${date(d.currentPeriodEnd)}` : 'Active'}</span>;
  if (d.status) return <span className="pill late"><Icon name="alert" />{d.status.replace(/_/g, ' ')}</span>;
  if (!d.plan) return <span className="pill">No plan yet</span>;
  return <span className={`pill ${required ? 'late' : ''}`}><Icon name="clock" />Not subscribed</span>;
}

// Dealership name with an inline rename (names appear in the workspace, reports and emails).
function RenameCell({ d, busy, onSave }: { d: DealershipMembership; busy: boolean; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(d.name);
  if (!editing) {
    return (
      <div>
        <div className="title">{d.name}</div>
        <button type="button" className="link-btn" data-rename={d.id} style={{ fontSize: 12, padding: 0 }} onClick={() => { setName(d.name); setEditing(true); }}>
          Rename
        </button>
      </div>
    );
  }
  const save = () => {
    const n = name.trim();
    if (n && n !== d.name) onSave(n);
    setEditing(false);
  };
  return (
    <form className="plan-edit" onSubmit={e => { e.preventDefault(); save(); }}>
      <input
        name="dealershipName"
        aria-label="Dealership name"
        value={name}
        maxLength={160}
        autoFocus
        style={{ width: 200, padding: '6px 8px' }}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && setEditing(false)}
      />
      <button className="btn btn-sm" type="submit" disabled={busy || !name.trim()}>Save</button>
    </form>
  );
}

// Membership switches and each dealership's agreed plan.
export function MembershipPanel({ expire }: { expire: () => void }) {
  const toast = useToast();
  const errorText = useApiErrors(expire);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [rows, setRows] = useState<DealershipMembership[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { amount: string; interval: 'month' | 'year' }>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [armed, setArmed] = useState(false);

  const fail = useCallback(
    (err: unknown) => {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    },
    [errorText, toast],
  );

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([api.get<AdminSettings>('/admin/settings'), api.get<DealershipMembership[]>('/admin/membership')]);
      setSettings(s);
      setRows(r);
      setDrafts(Object.fromEntries(r.map(d => [d.id, { amount: d.plan ? String(d.plan.amountCents / 100) : '', interval: d.plan?.interval ?? 'month' }])));
    } catch (err) {
      fail(err);
      setRows(r => r ?? []);
    }
  }, [fail]);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const saveSettings = async (patch: Partial<AdminSettings>) => {
    try {
      setSettings(await api.patch<AdminSettings>('/admin/settings', patch));
      toast('Settings saved');
      load();
    } catch (err) {
      fail(err);
    }
  };

  // Turning the requirement on affects every dealership, so it takes a second click.
  const toggleRequired = () => {
    if (!settings) return;
    if (!settings.membershipRequired && !armed) return setArmed(true);
    setArmed(false);
    saveSettings({ membershipRequired: !settings.membershipRequired });
  };

  const patch = async (d: DealershipMembership, body: Record<string, unknown>, done: string) => {
    setBusy(b => ({ ...b, [d.id]: true }));
    try {
      const updated = await api.patch<DealershipMembership>(`/admin/dealerships/${encodeURIComponent(d.id)}`, body);
      setRows(rs => rs?.map(r => (r.id === d.id ? updated : r)) ?? rs);
      toast(done);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(b => ({ ...b, [d.id]: false }));
    }
  };

  const savePlan = (d: DealershipMembership) => {
    const draft = drafts[d.id];
    const amount = Number(draft?.amount);
    if (!(amount > 0)) return toast('Enter the agreed amount in dollars', 'error');
    patch(d, { planAmount: amount, planInterval: draft.interval }, `${d.name}: plan saved`);
  };

  const unchanged = (d: DealershipMembership) => {
    const draft = drafts[d.id];
    return !!d.plan && Number(draft?.amount) * 100 === d.plan.amountCents && draft?.interval === d.plan.interval;
  };

  return (
    <section data-panel="membership" aria-labelledby="membership-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Billing</p>
          <h2 id="membership-title">Membership</h2>
        </div>
      </header>

      <div className="card settings-grid" style={{ marginBottom: 20 }}>
        <div className="switch-row">
          <div>
            <label className="switch">
              <input type="checkbox" id="membership-required" checked={!!settings?.membershipRequired} disabled={!settings} onChange={toggleRequired} />
              <span className="track" aria-hidden="true" />
              Require membership
            </label>
            <p className="hint" style={{ marginTop: 6 }}>
              {armed
                ? 'Click again to turn it on. Dealerships without an active or complimentary membership will be paused from submitting.'
                : settings?.membershipRequired
                  ? 'On: dealerships need an active or complimentary membership to submit and update vehicles.'
                  : 'Off: every dealership can submit. Turn on once plans are set.'}
            </p>
          </div>
          <label className="field" style={{ gridAutoFlow: 'column', alignItems: 'center', gap: 10 }}>
            Grace after a failed payment
            <span className="plan-edit">
              <input
                className="inline-number"
                type="number"
                min={0}
                max={60}
                defaultValue={settings?.graceDays ?? 7}
                key={settings?.graceDays}
                onBlur={e => {
                  const n = Number(e.target.value);
                  if (settings && n !== settings.graceDays && n >= 0 && n <= 60) saveSettings({ graceDays: n });
                }}
              />
              days
            </span>
          </label>
        </div>
        {settings && (!settings.stripeConfigured || !settings.webhookConfigured) && (
          <div className="notice">
            <Icon name="alert" />
            <div>
              {!settings.stripeConfigured
                ? 'Stripe isn’t connected yet: add STRIPE_SECRET_KEY to set plans and take payments.'
                : 'Stripe webhook isn’t connected: renewals, failed payments and cancellations only update when a dealer opens their workspace.'}
            </div>
          </div>
        )}
      </div>

      <div className="table-card">
        <table className="list">
          <thead>
            <tr><th>Dealership</th><th>Agreed plan</th><th>Status</th><th>Renews</th><th>Complimentary</th></tr>
          </thead>
          <tbody id="membership-rows">
            {!rows ? (
              <SkeletonRows cols={5} rows={3} />
            ) : (
              rows.map(d => (
                <tr key={d.id} data-dealership={d.id}>
                  <td className="cell-main"><RenameCell d={d} busy={!!busy[d.id]} onSave={name => patch(d, { name }, `Renamed to ${name}`)} /></td>
                  <td data-label="Agreed plan">
                    <form
                      className="plan-edit"
                      onSubmit={e => {
                        e.preventDefault();
                        savePlan(d);
                      }}
                    >
                      <span className="money">
                        <input
                          name="amount"
                          type="number"
                          inputMode="decimal"
                          min={1}
                          step="0.01"
                          placeholder="Amount"
                          aria-label={`Amount for ${d.name}`}
                          value={drafts[d.id]?.amount ?? ''}
                          onChange={e => setDrafts(x => ({ ...x, [d.id]: { ...x[d.id], amount: e.target.value } }))}
                        />
                      </span>
                      <select
                        name="interval"
                        aria-label={`Billing frequency for ${d.name}`}
                        value={drafts[d.id]?.interval ?? 'month'}
                        onChange={e => setDrafts(x => ({ ...x, [d.id]: { ...x[d.id], interval: e.target.value as 'month' | 'year' } }))}
                      >
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                      <button className="btn btn-sm" type="submit" disabled={busy[d.id] || unchanged(d) || !settings?.stripeConfigured}>
                        {busy[d.id] ? 'Saving…' : d.plan ? 'Update' : 'Set plan'}
                      </button>
                    </form>
                  </td>
                  <td data-label="Status"><StatusPill d={d} required={!!settings?.membershipRequired} /></td>
                  <td data-label="Renews">{d.currentPeriodEnd && !d.exempt ? date(d.currentPeriodEnd) : '-'}</td>
                  <td data-label="Complimentary">
                    <label className="switch" style={{ fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        data-exempt={d.id}
                        checked={d.exempt}
                        disabled={busy[d.id]}
                        onChange={e => patch(d, { billingExempt: e.target.checked }, e.target.checked ? `${d.name} is complimentary` : `${d.name} now needs a membership`)}
                      />
                      <span className="track" aria-hidden="true" />
                      <span className="sr-only">Complimentary membership for {d.name}</span>
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {rows && !rows.length && <div className="empty"><strong>No dealerships yet</strong>Invite a dealership to set its membership plan.</div>}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        Changing a subscribed dealership’s plan applies from their next bill. Dealers manage payment details, invoices and cancellation in the Stripe billing portal.
      </p>
    </section>
  );
}
