import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '@/lib/server/env';
import { admin } from '@/lib/server/supabase';
import { badRequest, conflict, json, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { MAX_PHOTOS_PER_VEHICLE, MAX_PHOTO_BYTES, PHOTO_TYPES, loadVehicle, photoFolder } from '@/lib/server/vehicles';

// Step 1 of a photo upload: hand out one-time upload URLs so the browser sends the files
// straight to Supabase Storage (Vercel functions cap request bodies at ~4.5 MB).
// Step 2 is POST /vehicles/:id/photos with the paths that uploaded.
export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req, 'dealer');
  await requireActiveMembership(user);
  const vehicle = await loadVehicle(id, user);
  if (vehicle.status === 'completed') throw conflict('Completed reviews cannot take new photos');
  const { files } = z
    .object({
      files: z
        .array(
          z.object({
            contentType: z.string().refine(t => t in PHOTO_TYPES, 'Photos must be JPEG, PNG, WebP or HEIC'),
            size: z.number().int().positive().max(MAX_PHOTO_BYTES, 'Each photo must be 10 MB or less'),
          }),
        )
        .min(1)
        .max(20),
    })
    .parse(await readJson(req));

  const { count } = await admin().from('vehicle_photos').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicle.id);
  if ((count ?? 0) + files.length > MAX_PHOTOS_PER_VEHICLE) throw badRequest(`A vehicle can have up to ${MAX_PHOTOS_PER_VEHICLE} photos`);

  const bucket = admin().storage.from(env().PHOTO_BUCKET);
  const uploads = await Promise.all(
    files.map(async f => {
      const path = `${photoFolder(vehicle)}${randomUUID()}.${PHOTO_TYPES[f.contentType]}`;
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error) throw new Error(`Could not prepare upload: ${error.message}`);
      return { path, url: data.signedUrl, contentType: f.contentType };
    }),
  );
  // The public (anon) key is required by the storage gateway; it grants nothing on its own.
  return json({ uploads, headers: { apikey: env().SUPABASE_ANON_KEY } });
});
