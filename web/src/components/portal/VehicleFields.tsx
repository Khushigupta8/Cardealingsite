'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Vehicle, type VinResult } from '@/lib/client/api';

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const thisYear = new Date().getFullYear();

export type VehicleInput = {
  vin: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  askingPrice: number | null;
  conditionNotes: string | null;
};

export function readFields(form: HTMLFormElement): VehicleInput {
  const f = new FormData(form);
  const str = (k: string) => String(f.get(k) ?? '').trim();
  const num = (k: string) => (str(k) === '' ? null : Number(str(k)));
  return {
    vin: str('vin').toUpperCase(),
    year: num('year'),
    make: str('make'),
    model: str('model'),
    trim: str('trim') || null,
    mileage: num('mileage'),
    askingPrice: num('askingPrice'),
    conditionNotes: str('conditionNotes') || null,
  };
}

export function validate(v: VehicleInput) {
  if (!VIN_RE.test(v.vin)) return 'Check the VIN: 17 characters, letters and numbers, no I, O or Q.';
  if (!(v.year != null && v.year >= 1900 && v.year <= thisYear + 2)) return 'Enter the model year.';
  if (!v.make || !v.model) return 'Enter the make and model.';
  if (v.mileage == null || !(v.mileage >= 0)) return 'Enter the mileage.';
  if (v.askingPrice != null && !(v.askingPrice >= 0)) return 'Asking price must be a positive number.';
  return '';
}

// The vehicle inputs shared by "Submit a vehicle" and the edit form.
// A complete VIN is looked up automatically; only empty fields are filled in.
export function VehicleFields({ v }: { v?: Partial<Vehicle> }) {
  const [vin, setVin] = useState(v?.vin ?? '');
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'ok' | 'warn' | 'fail'; text?: string }>({ state: 'idle' });
  const vinRef = useRef<HTMLInputElement>(null);
  const tried = useRef(v?.vin ?? '');
  const bad = /[IOQ]/.test(vin) || /[^A-Z0-9]/.test(vin);
  const valid = VIN_RE.test(vin);

  const decode = useCallback(async (value: string) => {
    tried.current = value;
    setLookup({ state: 'busy' });
    try {
      const r = await api.get<VinResult>(`/vin/${value}`);
      const form = vinRef.current?.form;
      const fill = (name: string, val: string | number | null) => {
        const input = form?.elements.namedItem(name) as HTMLInputElement | null;
        if (input && !input.value && val != null && val !== '') input.value = String(val);
      };
      fill('year', r.year);
      fill('make', r.make);
      fill('model', r.model);
      fill('trim', r.trim);
      const found = [r.year, r.make, r.model].filter(Boolean).join(' ');
      setLookup(r.warning ? { state: 'warn', text: `${found}. ${r.warning}` } : { state: 'ok', text: `Found: ${found}` });
    } catch (err) {
      setLookup({ state: 'fail', text: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    if (valid && vin !== tried.current) decode(vin);
  }, [vin, valid, decode]);

  const note = bad
    ? 'VINs never use I, O or Q'
    : lookup.state === 'busy'
      ? 'Looking up…'
      : lookup.text && valid
        ? lookup.text
        : vin
          ? `${vin.length}/17 characters`
          : '17 characters, no I, O or Q. We fill in the details.';
  const tone = bad || lookup.state === 'fail' ? ' bad' : lookup.state === 'ok' && valid ? ' ok' : '';

  return (
    <>
      <div className="vin-row">
        <label className="field vin">
          <span>
            VIN{' '}
            <span className={`field-note${tone}`} id="vin-note" aria-live="polite">{note}</span>
          </span>
          <input ref={vinRef} name="vin" maxLength={17} autoComplete="off" spellCheck={false} required value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/s/g, ''))} />
        </label>
        <button type="button" className="btn" id="vin-lookup" disabled={!valid || lookup.state === 'busy'} onClick={() => decode(vin)}>
          Look up
        </button>
      </div>
      <div className="grid-3">
        <label className="field">Year<input name="year" type="number" inputMode="numeric" min={1900} max={thisYear + 2} defaultValue={v?.year ?? ''} required /></label>
        <label className="field">Make<input name="make" maxLength={60} defaultValue={v?.make ?? ''} placeholder="Porsche" required /></label>
        <label className="field">Model<input name="model" maxLength={80} defaultValue={v?.model ?? ''} placeholder="Macan" required /></label>
      </div>
      <div className="grid-3">
        <label className="field"><span>Trim <span className="optional">(optional)</span></span><input name="trim" maxLength={80} defaultValue={v?.trim ?? ''} /></label>
        <label className="field">Mileage<input name="mileage" type="number" inputMode="numeric" min={0} defaultValue={v?.mileage ?? ''} required /></label>
        <label className="field">
          <span>Asking price <span className="optional">(optional)</span></span>
          <span className="money"><input name="askingPrice" type="number" inputMode="numeric" min={0} step={100} defaultValue={v?.askingPrice ?? ''} /></span>
        </label>
      </div>
      <label className="field">
        Condition notes
        <textarea name="conditionNotes" maxLength={5000} placeholder="Service history, wear, damage, anything a buyer would notice" defaultValue={v?.conditionNotes ?? ''} />
      </label>
    </>
  );
}
