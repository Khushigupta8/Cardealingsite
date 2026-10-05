import 'server-only';
import { z } from 'zod';
import { env } from './env';
import { admin } from './supabase';
import { forbidden, maybe, must, notFound } from './http';
import type { AuthUser } from './auth';

export const STATUSES = ['pending', 'needs_info', 'completed'] as const;
export type Status = (typeof STATUSES)[number];

export const VEHICLE_COLUMNS =
  'id, dealership_id, vin, year, make, model, trim, mileage, condition_notes, asking_price, status, info_request, submitted_at, updated_at, completed_at, dealership:dealerships(name), summary:reviews(condition_grade, recommended_price)';

export type VehicleRow = {
  id: string;
  dealership_id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  condition_notes: string | null;
  asking_price: number | null;
  status: Status;
  info_request: string | null;
  submitted_at: string;
  updated_at: string;
  completed_at: string | null;
  dealership: { name: string } | null;
  summary: { condition_grade: number; recommended_price: number } | null;
};

export const toVehicle = (v: VehicleRow) => ({
  id: v.id,
  dealershipId: v.dealership_id,
  dealershipName: v.dealership?.name ?? null,
  vin: v.vin,
  year: v.year,
  make: v.make,
  model: v.model,
  trim: v.trim,
  mileage: v.mileage,
  conditionNotes: v.condition_notes,
  askingPrice: v.asking_price === null ? null : Number(v.asking_price),
  status: v.status,
  infoRequest: v.info_request,
  submittedAt: v.submitted_at,
  updatedAt: v.updated_at,
  completedAt: v.completed_at,
  // Headline result for lists; GET /vehicles/:id replaces it with the full review.
  review: v.summary ? { conditionGrade: v.summary.condition_grade, recommendedPrice: Number(v.summary.recommended_price) } : null,
});

export const asRow = (row: unknown) => row as VehicleRow;

// Dealers only ever see their own dealership's vehicles; reviewers and admins see all.
export function scoped<Q>(query: Q, user: AuthUser): Q {
  if (user.role !== 'dealer') return query;
  if (!user.dealershipId) throw forbidden();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- works on any PostgREST builder
  return (query as any).eq('dealership_id', user.dealershipId);
}

export async function loadVehicle(id: string, user: AuthUser): Promise<VehicleRow> {
  if (!z.uuid().safeParse(id).success) throw notFound('Vehicle not found');
  const row = maybe(await scoped(admin().from('vehicles').select(VEHICLE_COLUMNS).eq('id', id), user).maybeSingle());
  // 404 rather than 403 so other dealerships' vehicle ids are not confirmed to exist.
  if (!row) throw notFound('Vehicle not found');
  return asRow(row);
}

export const vehicleFields = z.object({
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN must be 17 characters (no I, O or Q)'),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 2),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  trim: z.string().trim().max(80).nullish(),
  mileage: z.coerce.number().int().min(0).max(2_000_000),
  conditionNotes: z.string().trim().max(5000).nullish(),
  askingPrice: z.coerce.number().min(0).max(100_000_000).nullish(),
});

export const toColumns = (v: Partial<z.infer<typeof vehicleFields>>) => {
  const row: Record<string, unknown> = {};
  if (v.vin !== undefined) row.vin = v.vin;
  if (v.year !== undefined) row.year = v.year;
  if (v.make !== undefined) row.make = v.make;
  if (v.model !== undefined) row.model = v.model;
  if (v.trim !== undefined) row.trim = v.trim || null;
  if (v.mileage !== undefined) row.mileage = v.mileage;
  if (v.conditionNotes !== undefined) row.condition_notes = v.conditionNotes || null;
  if (v.askingPrice !== undefined) row.asking_price = v.askingPrice ?? null;
  return row;
};

// ---- Photos ----

export const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_VEHICLE = 40;
const PHOTO_URL_TTL = 60 * 60;

export const photoFolder = (v: Pick<VehicleRow, 'dealership_id' | 'id'>) => `${v.dealership_id}/${v.id}/`;

export async function listPhotos(vehicleId: string) {
  const rows = must(
    await admin().from('vehicle_photos').select('id, storage_path, created_at').eq('vehicle_id', vehicleId).order('created_at'),
  );
  if (!rows.length) return [];
  const { data, error } = await admin()
    .storage.from(env().PHOTO_BUCKET)
    .createSignedUrls(rows.map(r => r.storage_path), PHOTO_URL_TTL);
  if (error) throw new Error(`Could not sign photo URLs: ${error.message}`);
  return rows.map((r, i) => ({ id: r.id as string, url: data[i]?.signedUrl ?? null, createdAt: r.created_at as string }));
}

export async function getReview(vehicleId: string) {
  const r = maybe(
    await admin()
      .from('reviews')
      .select('condition_grade, recommended_price, notes, graded_at')
      .eq('vehicle_id', vehicleId)
      .maybeSingle(),
  );
  return r
    ? {
        conditionGrade: r.condition_grade as number,
        recommendedPrice: Number(r.recommended_price),
        notes: r.notes as string | null,
        gradedAt: r.graded_at as string,
      }
    : null;
}
