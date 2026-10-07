'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type VehicleDetail } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { Drawer, Lightbox, useEscape, useToast } from '@/components/console/kit';
import { ReportButton, Thread } from '@/components/console/Thread';
import { GRADES, date, miles, money, vehicleName } from '@/components/console/format';
import { PhotoPicker, type Picked } from './photos';
import { VehicleFields, readFields, validate } from './VehicleFields';

const MAX_PHOTOS = 20;
type ErrorText = (e: unknown) => string;

// ---------- Submit a vehicle ----------
export function SubmitDrawer({ open, onClose, onCreated, errorText }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; errorText: ErrorText }) {
  const toast = useToast();
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [dirty, setDirty] = useState(false);
  const [warn, setWarn] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhotos([]);
    setDirty(false);
    setWarn(false);
    setError('');
    setProgress('');
    setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('[name=vin]')?.focus(), 0);
  }, [open]);

  // Only ask when a half-filled submission would be lost: the second close discards.
  const close = useCallback(() => {
    if ((dirty || photos.length) && !warn) return setWarn(true);
    onClose();
  }, [dirty, photos.length, warn, onClose]);
  useEscape({ lightbox: false, closeLightbox: () => {}, closeDrawer: () => open && close() });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const v = readFields(e.currentTarget);
    const problem = validate(v);
    setError(problem);
    if (problem) return;
    setBusy(true);
    let id: string | null = null;
    try {
      setProgress('Saving details…');
      const created = await api.post<{ id: string; year: number; make: string; model: string }>('/vehicles', v);
      id = created.id;
      if (photos.length) {
        setProgress(`Uploading ${photos.length} photo${photos.length > 1 ? 's' : ''}…`);
        await api.uploadPhotos(created.id, photos.map(p => p.file), i => setPhotos(ps => ps.map((p, j) => (j === i ? { ...p, done: true } : p))));
      }
      toast(`${vehicleName(created)} submitted for review`);
      onCreated(created.id);
    } catch (err) {
      // Details saved but photos failed: open the car so they can add the photos there.
      if (id) {
        toast(errorText(err) || 'Vehicle saved, but some photos did not upload. Add them again below.', 'error');
        return onCreated(id);
      }
      setError(errorText(err));
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      eyebrow="New submission"
      title="Submit a vehicle"
      footer={
        <>
          <p className="form-error" id="submit-error" role="alert">{error}</p>
          {warn && <p className="hint" id="discard-note">You have unsaved details. Close again to discard them.</p>}
          <div className="foot-actions">
            <span className="progress-note" id="submit-progress">{progress || 'It enters the queue as Pending. We’ll let you know when it’s reviewed.'}</span>
            <button className="btn btn-primary btn-lg" type="submit" form="submit-form" disabled={busy}>Submit for review</button>
          </div>
        </>
      }
    >
      <form id="submit-form" className="vehicle-form" noValidate onSubmit={submit} onInput={() => setDirty(true)} ref={formRef}>
        <VehicleFields />
        <div>
          <p className="section-title"><Icon name="photo" /> Photos</p>
          <PhotoPicker id="new-photos" files={photos} onChange={setPhotos} limit={MAX_PHOTOS} />
          <p className="hint">Exterior from all sides, interior, odometer, and any damage. More photos mean a more accurate review.</p>
        </div>
      </form>
    </Drawer>
  );
}

// ---------- Vehicle detail ----------
export function VehicleDrawer({ id, onClose, onChanged, errorText }: { id: string | null; onClose: () => void; onChanged: () => void; errorText: ErrorText }) {
  const toast = useToast();
  const [v, setV] = useState<VehicleDetail | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

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
  }, [id, reload]);

  useEscape({ lightbox: !!photo, closeLightbox: () => setPhoto(null), closeDrawer: onClose });
  const refresh = () => { setReload(r => r + 1); onChanged(); };

  const shown = v && v.id === id ? v : null;
  return (
    <>
      <Drawer
        open={!!id}
        onClose={onClose}
        eyebrow={!shown ? 'Loading…' : { pending: 'In review', needs_info: 'Needs your input', completed: `Completed ${date(shown.completedAt)}` }[shown.status]}
        title={shown ? `${vehicleName(shown)}${shown.trim ? ' ' + shown.trim : ''}` : ''}
        footer={shown?.status === 'needs_info' && <Resubmit v={shown} errorText={errorText} onDone={() => { onClose(); onChanged(); }} />}
      >
        {!shown ? <div className="skeleton-block" /> : <Detail v={shown} errorText={errorText} onPhoto={setPhoto} onChanged={refresh} />}
      </Drawer>
      <Lightbox src={photo} onClose={() => setPhoto(null)} />
    </>
  );
}

function Resubmit({ v, errorText, onDone }: { v: VehicleDetail; errorText: ErrorText; onDone: () => void }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const go = async () => {
    setBusy(true);
    try {
      await api.post(`/vehicles/${encodeURIComponent(v.id)}/resubmit`, note.trim() ? { note: note.trim() } : {});
      toast(`${vehicleName(v)} is back in the review queue`);
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <>
      <label className="field">
        <span>Note for your reviewer <span className="optional">(optional)</span></span>
        <textarea id="resubmit-note" rows={2} style={{ minHeight: 56 }} maxLength={4000} placeholder="Added close-ups of the driver seat bolster." value={note} onChange={e => setNote(e.target.value)} />
      </label>
      <p className="form-error" id="resubmit-error">{error}</p>
      <div className="foot-actions">
        <span className="hint">Done adding what they asked for?</span>
        <button className="btn btn-primary btn-lg" id="resubmit" disabled={busy} onClick={go}><Icon name="check" />Resubmit for review</button>
      </div>
    </>
  );
}

function Detail({ v, errorText, onPhoto, onChanged }: { v: VehicleDetail; errorText: ErrorText; onPhoto: (url: string) => void; onChanged: () => void }) {
  const toast = useToast();
  const locked = v.status === 'completed';
  const r = v.review;
  const diff = r && v.askingPrice != null ? r.recommendedPrice - v.askingPrice : null;
  const [armed, setArmed] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<Picked[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Two-step delete: the first click arms the button for 3 seconds.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const del = async (photoId: string) => {
    if (armed !== photoId) return setArmed(photoId);
    setDeleting(photoId);
    try {
      await api.del(`/vehicles/${encodeURIComponent(v.id)}/photos/${encodeURIComponent(photoId)}`);
      setGone(g => [...g, photoId]);
      toast('Photo deleted');
    } catch (err) {
      toast(errorText(err) || 'Could not delete photo', 'error');
    } finally {
      setDeleting(null);
      setArmed(null);
    }
  };

  const upload = async () => {
    setUploading(true);
    try {
      await api.uploadPhotos(v.id, newPhotos.map(p => p.file), i => setNewPhotos(ps => ps.map((p, j) => (j === i ? { ...p, done: true } : p))));
      toast('Photos added');
      setNewPhotos([]);
      onChanged();
    } catch (err) {
      toast(errorText(err) || 'Upload failed', 'error');
      onChanged();
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const changes = readFields(e.currentTarget);
    const problem = validate(changes);
    setEditError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await api.patch(`/vehicles/${encodeURIComponent(v.id)}`, changes);
      toast('Details saved');
      onChanged();
    } catch (err) {
      setEditError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const photos = v.photos.filter(p => !gone.includes(p.id));
  return (
    <>
      {v.status === 'needs_info' && (
        <div className="notice">
          <Icon name="alert" />
          <div>
            <strong>Your reviewer asked:</strong><br />“{v.infoRequest}”<br />
            <span className="hint">Update the details or add photos below, then resubmit.</span>
          </div>
        </div>
      )}
      {r && (
        <div className="report">
          <div className="report-cta">
            <p className="section-title" style={{ margin: 0 }}><Icon name="check" /> Your review · {date(r.gradedAt)}</p>
            <ReportButton vehicleId={v.id} errorText={errorText} primary />
          </div>
          <div className="report-figs">
            <div><span>Your condition rating</span><strong>{r.conditionGrade}/5</strong><small>{GRADES[r.conditionGrade]}</small></div>
            <div>
              <span>Recommended listing</span>
              <strong>{money(r.recommendedPrice)}</strong>
              <small>{diff == null ? '' : diff === 0 ? 'Same as your asking price' : `${money(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} your asking price`}</small>
            </div>
          </div>
          {r.notes && <div><span className="section-title" style={{ marginBottom: 4 }}>Reviewer notes</span><p className="notes">{r.notes}</p></div>}
        </div>
      )}
      {v.status === 'pending' && (
        <div className="notice" style={{ borderColor: 'var(--line-strong)', background: 'var(--surface-2)' }}>
          <Icon name="clock" />
          <div>In the review queue since {date(v.submittedAt)}. You can still correct details or add photos.</div>
        </div>
      )}
      <div>
        <p className="section-title"><Icon name="photo" /> Photos ({photos.length})</p>
        {photos.length ? (
          <div className="photos-edit">
            {photos.map((p, i) => (
              <div className="photo-tile" key={p.id}>
                <button type="button" data-photo={p.url ?? ''} aria-label={`View photo ${i + 1}`} onClick={() => p.url && onPhoto(p.url)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed, expiring storage URL */}
                  <img src={p.url ?? ''} alt="" loading="lazy" />
                </button>
                {!locked && (
                  <button
                    type="button"
                    className="del"
                    data-delete-photo={p.id}
                    disabled={deleting === p.id}
                    style={armed === p.id ? { background: 'var(--accent)' } : undefined}
                    title={armed === p.id ? 'Click again to delete' : 'Delete photo'}
                    aria-label={armed === p.id ? 'Click again to delete' : `Delete photo ${i + 1}`}
                    onClick={() => del(p.id)}
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-photos"><Icon name="photo" /> No photos yet.</div>
        )}
        {!locked && (
          <>
            <div style={{ marginTop: 10 }}>
              <PhotoPicker id="add-photos" files={newPhotos} onChange={setNewPhotos} limit={MAX_PHOTOS} />
            </div>
            {!!newPhotos.length && (
              <div className="foot-actions" style={{ marginTop: 8 }}>
                <span />
                <button className="btn" id="upload-more" disabled={uploading} onClick={upload}><Icon name="upload" />{uploading ? 'Uploading…' : 'Upload photos'}</button>
              </div>
            )}
          </>
        )}
      </div>
      {locked ? (
        <>
          <div>
            <p className="section-title">Vehicle</p>
            <div className="facts">
              {([['VIN', v.vin], ['Mileage', miles(v.mileage)], ['Your asking', money(v.askingPrice)], ['Submitted', date(v.submittedAt)], ['Completed', date(v.completedAt)], ['Trim', v.trim || '-']] as [string, string][]).map(([k, val]) => (
                <div className="fact" key={k}><span>{k}</span>{val}</div>
              ))}
            </div>
          </div>
          {v.conditionNotes && <div><p className="section-title">Your notes</p><p className="notes">{v.conditionNotes}</p></div>}
        </>
      ) : (
        <form id="edit-form" className="vehicle-form" noValidate onSubmit={save} key={v.updatedAt}>
          <p className="section-title" style={{ margin: 0 }}>Details</p>
          <VehicleFields v={v} />
          <p className="form-error" id="edit-error">{editError}</p>
          <div className="foot-actions">
            <span className="hint">Changes go to your reviewer straight away.</span>
            <button className="btn" type="submit" disabled={saving}>Save changes</button>
          </div>
        </form>
      )}
      <Thread vehicleId={v.id} viewer="dealer" errorText={errorText} refreshKey={v.updatedAt ? Date.parse(v.updatedAt) : 0} />
    </>
  );
}
