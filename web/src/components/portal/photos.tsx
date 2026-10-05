'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/console/icons';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_BYTES = 10 * 1024 * 1024;

// Shrink big phone photos before upload (max 2000px JPEG); fall back to the original file.
export async function preparePhoto(file: File): Promise<File> {
  const heic = /\.heic$/i.test(file.name);
  if (!PHOTO_TYPES.includes(file.type) && !heic) throw new Error(`${file.name} is not a photo (JPEG, PNG, WebP or HEIC).`);
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 2.5e6 && file.type === 'image/jpeg') return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob) throw new Error('encode failed');
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // Browsers that can't decode HEIC upload the original.
    if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 10 MB.`);
    return file.type ? file : new File([file], file.name, { type: 'image/heic' });
  }
}

export type Picked = { file: File; url: string; done?: boolean };

// Drop zone + preview grid. The parent owns the list so it can upload and clear it.
export function PhotoPicker({ files, onChange, limit, id }: { files: Picked[]; onChange: (f: Picked[]) => void; limit: number; id?: string }) {
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(files);
  useEffect(() => {
    latest.current = files;
  }, [files]);

  // Release preview URLs when the picker goes away.
  useEffect(() => () => latest.current.forEach(f => URL.revokeObjectURL(f.url)), []);

  const add = async (list: File[]) => {
    setError('');
    let next = [...latest.current];
    for (const file of list) {
      if (next.length >= limit) { setError(`You can add up to ${limit} photos here.`); break; }
      try {
        const ready = await preparePhoto(file);
        next = [...next, { file: ready, url: URL.createObjectURL(ready) }];
        onChange(next);
      } catch (e) {
        setError((e as Error).message);
      }
    }
  };

  return (
    <div id={id}>
      <label
        className={`dropzone${over ? ' over' : ''}`}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add([...e.dataTransfer.files]); }}
      >
        <Icon name="upload" />
        <strong>Add photos</strong>
        <span>Drag them here or click to choose · up to {limit}</span>
        <input ref={input} type="file" accept="image/*,.heic" multiple onChange={e => { add([...(e.target.files ?? [])]); e.target.value = ''; }} />
      </label>
      {!!files.length && (
        <div className="previews">
          {files.map((f, i) => (
            <div className="preview" key={f.url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={f.url} alt="" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => {
                  URL.revokeObjectURL(f.url);
                  onChange(files.filter((_, j) => j !== i));
                }}
              >
                <Icon name="close" />
              </button>
              <span className="bar" style={{ width: f.done ? '100%' : 0 }} />
            </div>
          ))}
        </div>
      )}
      <p className="form-error photo-error">{error}</p>
    </div>
  );
}
