'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Status, type Vehicle, type VehicleDetail, type VehicleList } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { AgePill, Drawer, Lightbox, SkeletonRows, useApiErrors, useEscape, useToast } from '@/components/console/kit';
import { ReportButton, Thread } from '@/components/console/Thread';
import { UnreadBadge, useUnreadChanged } from '@/components/console/Notifications';
import { GRADES, age, date, miles, money, vehicleName } from '@/components/console/format';

const STATUS_LABEL: Record<Status, string> = { pending: 'Pending review', needs_info: 'Needs info', completed: 'Completed' };
const EMPTY: Record<Status, [string, string]> = {
  pending: ['Queue is clear', 'New submissions from dealerships will appear here.'],
  needs_info: ['Nothing waiting on dealers', 'Cars you send back for more information appear here.'],
  completed: ['No completed reviews yet', 'Graded vehicles appear here.'],
};

export function QueuePanel({
  expire,
  onCounts,
  openId,
  setOpenId,
}: {
  expire: () => void;
  onCounts: (c: Record<Status, number>) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const toast = useToast();
  const errorText = useApiErrors(expire);
  const [status, setStatus] = useState<Status>('pending');
  const [q, setQ] = useState('');
  const [data, setData] = useState<VehicleList | null>(null);
  const [oldest, setOldest] = useState<Vehicle | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Each load gets a ticket; a slower, older load (e.g. the previous tab) must not overwrite a newer one.
  const ticket = useRef(0);
  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setError('');
    const params = new URLSearchParams({ status, limit: '100' });
    if (q.trim()) params.set('q', q.trim());
    try {
      // Oldest pending car comes first for the review team.
      const [list, old] = await Promise.all([api.get<VehicleList>(`/vehicles?${params}`), api.get<VehicleList>('/vehicles?status=pending&limit=1')]);
      if (mine !== ticket.current) return;
      setData(list);
      setOldest(old.items[0] ?? null);
      onCounts(list.counts);
    } catch (err) {
      const msg = errorText(err);
      if (msg) setError(msg);
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
  }, [status, q, errorText, onCounts]);

  // New or newly read messages change the row badges.
  useUnreadChanged(load);

  // Debounce typing in search; status changes load straight away.
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

  const rowKeys = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    const row = e.currentTarget;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(id); }
    if (e.key === 'ArrowDown') { e.preventDefault(); (row.nextElementSibling as HTMLElement)?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (row.previousElementSibling as HTMLElement)?.focus(); }
  };

  return (
    <section data-panel="queue" aria-labelledby="queue-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Review team</p>
          <h2 id="queue-title">Review queue</h2>
        </div>
        <button className="btn" id="refresh" onClick={load}>
          <Icon name="refresh" />
          Refresh
        </button>
      </header>

      <div className="kpis" aria-label="Queue summary">
        <Kpi label="Waiting for review" value={counts?.pending} id="pending" />
        <Kpi label="Waiting on dealers" value={counts?.needs_info} id="needs_info" />
        <Kpi label="Completed" value={counts?.completed} id="completed" />
        <div className="kpi">
          <span className="kpi-label">Oldest in queue</span>
          <span className="kpi-value" data-kpi="oldest">{oldest === undefined ? '-' : oldest ? age(oldest.submittedAt).label : '-'}</span>
          <span className="kpi-sub" data-kpi="oldest-name">{oldest ? `${vehicleName(oldest)} · ${oldest.dealershipName ?? ''}` : oldest === null ? 'Queue is clear' : ''}</span>
        </div>
      </div>

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
          <input id="search" type="search" placeholder="Search make, model, trim or VIN" aria-label="Search vehicles" value={q} onChange={e => setQ(e.target.value)} />
          <kbd>/</kbd>
        </label>
      </div>

      <div className="table-card">
        <table className="list">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Dealership</th>
              <th>VIN</th>
              <th className="num">Mileage</th>
              <th className="num">Asking</th>
              <th id="age-col">{{ pending: 'Waiting', needs_info: 'Asked', completed: 'Completed' }[status]}</th>
            </tr>
          </thead>
          <tbody id="vehicle-rows">
            {loading && !items.length ? (
              <SkeletonRows cols={6} />
            ) : (
              items.map(v => (
                <tr
                  key={v.id}
                  className={`clickable${v.id === openId ? ' active' : ''}`}
                  data-id={v.id}
                  tabIndex={0}
                  aria-label={`Open ${vehicleName(v)}`}
                  onClick={() => setOpenId(v.id)}
                  onKeyDown={e => rowKeys(e, v.id)}
                >
                  <td className="cell-main">
                    <div className="title">{vehicleName(v)}<UnreadBadge n={v.unread} /></div>
                    <div className="sub">{v.trim || '-'}</div>
                  </td>
                  <td data-label="Dealership">{v.dealershipName || '-'}</td>
                  <td className="mono" data-label="VIN">{v.vin}</td>
                  <td className="num" data-label="Mileage">{miles(v.mileage)}</td>
                  <td className="num" data-label="Asking">{money(v.askingPrice)}</td>
                  <td data-label={{ pending: 'Waiting', needs_info: 'Asked', completed: 'Completed' }[status]}>
                    {status === 'completed' ? (
                      <span className="pill ok"><Icon name="check" />{date(v.completedAt)}</span>
                    ) : (
                      <AgePill since={status === 'pending' ? v.submittedAt : v.updatedAt} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !error && !items.length && (
          <div className="empty" id="vehicles-empty">
            {q.trim() ? (
              <><strong>No matches for “{q.trim()}”</strong>Try a make, model, trim or part of the VIN.</>
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

      <VehicleDrawer
        id={openId}
        onClose={() => setOpenId(null)}
        expire={expire}
        onDone={msg => {
          setOpenId(null);
          toast(msg);
          load();
        }}
      />
    </section>
  );
}

function Kpi({ label, value, id }: { label: string; value: number | undefined; id: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" data-kpi={id}>{value == null ? '-' : value.toLocaleString('en-US')}</span>
    </div>
  );
}

// ---------- Vehicle drawer ----------
function VehicleDrawer({ id, onClose, onDone, expire }: { id: string | null; onClose: () => void; onDone: (msg: string) => void; expire: () => void }) {
  const errorText = useApiErrors(expire);
  const toast = useToast();
  const [loaded, setV] = useState<VehicleDetail | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  // "Ask for info" applies to the car it was chosen on; any other car opens on grading.
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const mode = infoFor === id ? 'info' : 'grade';
  const setMode = (m: 'grade' | 'info') => setInfoFor(m === 'info' ? id : null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    api.get<VehicleDetail>(`/vehicles/${encodeURIComponent(id)}`).then(
      d => live && setV(d),
      err => {
        const msg = errorText(err);
        if (msg) toast(msg, 'error');
        onClose();
      },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEscape({ lightbox: !!photo, closeLightbox: () => setPhoto(null), closeDrawer: onClose });

  // Until the selected car loads, show the loading state rather than the previous car.
  const v = loaded && loaded.id === id ? loaded : null;
  const facts: [string, string][] = v
    ? [
        ['Dealership', v.dealershipName || '-'],
        ['Mileage', miles(v.mileage)],
        ['Dealer asking', money(v.askingPrice)],
        ['VIN', v.vin],
        ['Submitted', date(v.submittedAt)],
        ['Last update', date(v.updatedAt)],
      ]
    : [];

  return (
    <>
      <Drawer
        open={!!id}
        onClose={onClose}
        eyebrow={v ? STATUS_LABEL[v.status] : 'Loading…'}
        title={v ? `${vehicleName(v)}${v.trim ? ' ' + v.trim : ''}` : ''}
        footer={
          v?.status === 'pending' &&
          (mode === 'grade' ? (
            <GradeForm v={v} onInfo={() => setMode('info')} onDone={onDone} errorText={errorText} />
          ) : (
            <InfoForm v={v} onGrade={() => setMode('grade')} onDone={onDone} errorText={errorText} />
          ))
        }
      >
        {!v ? (
          <div className="skeleton-block" />
        ) : (
          <>
            {v.status === 'needs_info' && (
              <div className="notice">
                <Icon name="alert" />
                <div><strong>Waiting on the dealer.</strong><br />You asked: “{v.infoRequest}”</div>
              </div>
            )}
            {v.review && (
              <div className="result">
                <div className="report-cta">
                  <p className="section-title" style={{ margin: 0 }}><Icon name="check" /> Completed {date(v.review.gradedAt)}</p>
                  <ReportButton vehicleId={v.id} errorText={errorText} />
                </div>
                <div className="result-figs">
                  <div><span>Condition</span><strong>{v.review.conditionGrade}/5 · {GRADES[v.review.conditionGrade]}</strong></div>
                  <div><span>Recommended listing</span><strong>{money(v.review.recommendedPrice)}</strong></div>
                </div>
                {v.review.notes && <p className="notes">{v.review.notes}</p>}
              </div>
            )}
            <div>
              <p className="section-title">Vehicle</p>
              <div className="facts">
                {facts.map(([k, val]) => (
                  <div className="fact" key={k}>
                    <span>{k}</span>
                    {k === 'VIN' ? <span className="mono" style={{ color: 'var(--text)', fontSize: 13, margin: 0 }}>{val}</span> : val}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="section-title">Dealer notes</p>
              <p className="notes">{v.conditionNotes || 'No notes provided.'}</p>
            </div>
            <div>
              <p className="section-title"><Icon name="photo" /> Photos ({v.photos.length})</p>
              {v.photos.length ? (
                <div className="photos">
                  {v.photos.map((p, i) => (
                    <button type="button" key={p.id} data-photo={p.url ?? ''} aria-label={`View photo ${i + 1}`} onClick={() => p.url && setPhoto(p.url)}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed, expiring storage URL */}
                      <img src={p.url ?? ''} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="no-photos"><Icon name="photo" /> No photos uploaded yet.</div>
              )}
            </div>
            <Thread vehicleId={v.id} viewer="team" errorText={errorText} />
          </>
        )}
      </Drawer>
      <Lightbox src={photo} onClose={() => setPhoto(null)} />
    </>
  );
}

type ActProps = { v: VehicleDetail; onDone: (msg: string) => void; errorText: (e: unknown) => string };

function GradeForm({ v, onInfo, onDone, errorText }: ActProps & { onInfo: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const grade = f.get('conditionGrade');
    const price = String(f.get('recommendedPrice') ?? '');
    if (!grade) return setError('Pick a condition grade.');
    if (price === '' || !(Number(price) >= 0)) return setError('Enter a recommended listing price.');
    setBusy(true);
    setError('');
    try {
      await api.post(`/vehicles/${encodeURIComponent(v.id)}/review`, {
        conditionGrade: Number(grade),
        recommendedPrice: Number(price),
        notes: String(f.get('notes') || '') || null,
      });
      onDone(`${vehicleName(v)} completed`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <form id="grade-form" className="form-stack" noValidate onSubmit={submit}>
      <fieldset className="grades">
        <legend>Condition grade</legend>
        {[5, 4, 3, 2, 1].map(n => (
          <label key={n}>
            <input type="radio" name="conditionGrade" value={n} />
            <span><b>{n}</b><small>{GRADES[n]}</small></span>
          </label>
        ))}
      </fieldset>
      <div className="row-2">
        <label className="field">
          Recommended listing price
          <span className="money"><input name="recommendedPrice" type="number" inputMode="numeric" min={0} step={100} /></span>
        </label>
        <p className="hint" style={{ alignSelf: 'end' }}>Dealer is asking {money(v.askingPrice)}.</p>
      </div>
      <label className="field">
        Reviewer notes
        <textarea name="notes" placeholder="What stands out: condition, wear, anything a buyer would notice" />
      </label>
      <p className="form-error">{error}</p>
      <div className="foot-actions">
        <button type="button" className="link-btn" id="show-info" onClick={onInfo}>Need more from the dealer?</button>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}><Icon name="check" />Complete review</button>
      </div>
    </form>
  );
}

function InfoForm({ v, onGrade, onDone, errorText }: ActProps & { onGrade: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const message = String(new FormData(e.currentTarget).get('message') ?? '').trim();
    if (!message) return setError('Tell the dealer what you need.');
    setBusy(true);
    setError('');
    try {
      await api.post(`/vehicles/${encodeURIComponent(v.id)}/request-info`, { message });
      onDone(`Sent back to ${v.dealershipName || 'the dealer'}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <form id="info-form" className="form-stack" noValidate onSubmit={submit}>
      <label className="field">
        What do you need from the dealer?
        <textarea name="message" ref={ref} placeholder="Could you add a closer photo of the driver’s seat bolster and the rear seats?" />
      </label>
      <p className="hint">The car moves to <em>Needs info</em> and returns to this queue when the dealer resubmits.</p>
      <p className="form-error">{error}</p>
      <div className="foot-actions">
        <button type="button" className="link-btn" id="show-grade" onClick={onGrade}>Back to grading</button>
        <button className="btn btn-lg" type="submit" disabled={busy}>Send back to dealer</button>
      </div>
    </form>
  );
}
