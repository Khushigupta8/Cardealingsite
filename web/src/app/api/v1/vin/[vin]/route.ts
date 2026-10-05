import { HttpError, badRequest, json, notFound, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';

// "PORSCHE" -> "Porsche", but keep short brand codes like "BMW" and "GMC".
const tidy = (s: string) => (s.length <= 3 ? s : s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()));

// Decode a VIN with the US NHTSA vPIC service (free, no key) to fill year, make, model and trim.
export const GET = route<{ vin: string }>(async (req, { vin }) => {
  await requireUser(req);
  const v = vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) throw badRequest('VIN must be 17 characters (no I, O or Q)');

  let r: Record<string, string>;
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${v}?format=json`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) throw new Error(String(res.status));
    r = (await res.json()).Results?.[0] ?? {};
  } catch {
    throw new HttpError(503, 'VIN lookup is unavailable right now. Enter the details by hand.', 'vin_unavailable');
  }

  const year = Number(r.ModelYear) || null;
  if (!r.Make || !year) throw notFound('No match for this VIN. Enter the details by hand.');
  // vPIC error code "0" means clean; others (e.g. check digit) are worth a second look.
  const codes = String(r.ErrorCode ?? '0').split(',').map(c => c.trim());
  return json({
    vin: v,
    year,
    make: tidy(r.Make),
    model: r.Model || null,
    // vPIC "Series" is often a chassis code (e.g. "Type 95B"), so only a real trim is used.
    trim: r.Trim || null,
    warning: codes.every(c => c === '0') ? null : 'This VIN didn’t fully validate. Double-check it against the vehicle.',
  });
});
