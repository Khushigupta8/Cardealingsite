'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Enquiry, type EnquiryStatus } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { SkeletonRows, useApiErrors, useToast } from '@/components/console/kit';
import { date } from '@/components/console/format';

const STATUSES: { id: EnquiryStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'invited', label: 'Invited' },
  { id: 'closed', label: 'Closed' },
];

export type InvitePrefill = { email: string; dealershipName: string; enquiryId: string };

// Dealerships that asked for an invitation from the homepage.
export function EnquiriesPanel({ expire, onInvite, onCounts }: { expire: () => void; onInvite: (p: InvitePrefill) => void; onCounts: (newCount: number) => void }) {
  const toast = useToast();
  const errorText = useApiErrors(expire);
  const [status, setStatus] = useState<EnquiryStatus>('new');
  const [data, setData] = useState<{ items: Enquiry[]; counts: Record<EnquiryStatus, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  // Ignore an older load that finishes after a newer one (fast tab switching).
  const ticket = useRef(0);
  const load = useCallback(async () => {
    const mine = ++ticket.current;
    try {
      const d = await api.get<{ items: Enquiry[]; counts: Record<EnquiryStatus, number> }>(`/admin/enquiries?status=${status}`);
      if (mine !== ticket.current) return;
      setData(d);
      onCounts(d.counts.new);
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, [status, errorText, toast, onCounts]);
  useEffect(() => {
    load();
  }, [load]);

  const move = async (e: Enquiry, next: EnquiryStatus) => {
    try {
      await api.patch(`/admin/enquiries/${encodeURIComponent(e.id)}`, { status: next });
      toast(`${e.dealership} moved to ${STATUSES.find(s => s.id === next)!.label}`);
      load();
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    }
  };

  const items = data?.items ?? [];
  return (
    <section data-panel="enquiries" aria-labelledby="enquiries-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">From the website</p>
          <h2 id="enquiries-title">Enquiries</h2>
        </div>
        <button className="btn" onClick={load}><Icon name="refresh" />Refresh</button>
      </header>
      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Enquiry status">
          {STATUSES.map(s => (
            <button
              key={s.id}
              role="tab"
              data-enquiry-status={s.id}
              aria-selected={status === s.id}
              onClick={() => {
                if (s.id === status) return;
                setLoading(true);
                setStatus(s.id);
              }}
            >
              {s.label} <span>{data?.counts[s.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="table-card">
        <table className="list">
          <thead>
            <tr><th>Dealership</th><th>Contact</th><th>Location</th><th>Per month</th><th>Received</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody id="enquiry-rows">
            {loading && !items.length ? (
              <SkeletonRows cols={7} rows={3} />
            ) : (
              items.map(e => (
                <tr key={e.id} data-enquiry={e.id}>
                  <td className="cell-main">
                    <div className="title">{e.dealership}</div>
                    {e.message && <div className="enquiry-msg">“{e.message}”</div>}
                  </td>
                  <td data-label="Contact">
                    <div>{e.name}</div>
                    <div className="sub"><a href={`mailto:${e.email}`}>{e.email}</a>{e.phone ? ` · ${e.phone}` : ''}</div>
                  </td>
                  <td data-label="Location">{e.location || '-'}</td>
                  <td data-label="Per month">{e.monthlyVolume || '-'}</td>
                  <td data-label="Received">{date(e.createdAt)}</td>
                  <td data-label="Status">
                    <select className="status-select" aria-label={`Status for ${e.dealership}`} value={e.status} onChange={ev => move(e, ev.target.value as EnquiryStatus)}>
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="num" data-label="">
                    {e.status !== 'invited' && e.status !== 'closed' && (
                      <button className="btn btn-sm btn-primary" data-invite-enquiry={e.id} onClick={() => onInvite({ email: e.email, dealershipName: e.dealership, enquiryId: e.id })}>
                        Invite
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !items.length && (
          <div className="empty" id="enquiries-empty">
            {status === 'new' ? (
              <><strong>No new enquiries</strong>When a dealership uses “Request an invitation” on the website, it appears here.</>
            ) : (
              <><strong>Nothing here</strong>Enquiries you move to this status appear here.</>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
