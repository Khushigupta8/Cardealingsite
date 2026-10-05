import type { Vehicle } from '@/lib/client/api';

export const money = (n: number | null | undefined) =>
  n == null ? '-' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const miles = (n: number) => `${Number(n).toLocaleString('en-US')} mi`;
export const date = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
export const vehicleName = (v: Pick<Vehicle, 'year' | 'make' | 'model'>) => `${v.year} ${v.make} ${v.model}`;

export const GRADES: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Rough', 1: 'Poor' };

// "5h", "2d" since a timestamp, plus how urgent that is.
export function age(since: string) {
  const hours = Math.max(0, (Date.now() - new Date(since).getTime()) / 36e5);
  const label = hours < 1 ? 'Just now' : hours < 24 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
  return { label, level: hours >= 48 ? 'late' : hours >= 24 ? 'warn' : '' };
}
