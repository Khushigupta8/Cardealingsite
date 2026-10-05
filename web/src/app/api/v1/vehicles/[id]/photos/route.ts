import { z } from 'zod';
import { env } from '@/lib/server/env';
import { admin } from '@/lib/server/supabase';
import { badRequest, conflict, json, must, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { MAX_PHOTOS_PER_VEHICLE, listPhotos, loadVehicle, photoFolder } from '@/lib/server/vehicles';

// Step 2 of a photo upload: record the files the browser uploaded with the URLs from
// POST /vehicles/:id/photos/uploads. Only paths inside this vehicle's folder that really exist are accepted.
export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req, 'dealer');
  await requireActiveMembership(user);
  const vehicle = await loadVehicle(id, user);
  if (vehicle.status === 'completed') throw conflict('Completed reviews cannot take new photos');
  const { paths } = z.object({ paths: z.array(z.string().min(1).max(300)).min(1).max(20) }).parse(await readJson(req));

  const folder = photoFolder(vehicle);
  const names = paths.map(p => {
    if (!p.startsWith(folder) || p.slice(folder.length).includes('/')) throw badRequest('Photo path does not belong to this vehicle');
    return p.slice(folder.length);
  });

  const { data: stored, error } = await admin()
    .storage.from(env().PHOTO_BUCKET)
    .list(folder.slice(0, -1), { limit: 1000 });
  if (error) throw new Error(`Could not check uploads: ${error.message}`);
  const present = new Set(stored.map(o => o.name));
  const missing = names.filter(n => !present.has(n));
  if (missing.length) throw badRequest(`${missing.length} photo(s) did not finish uploading. Try adding them again.`);

  // Re-check the cap here too: upload URLs can be requested several times before registering.
  const { count } = await admin().from('vehicle_photos').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicle.id);
  if ((count ?? 0) + paths.length > MAX_PHOTOS_PER_VEHICLE) throw badRequest(`A vehicle can have up to ${MAX_PHOTOS_PER_VEHICLE} photos`);
  must(
    await admin()
      .from('vehicle_photos')
      .upsert(
        paths.map(storage_path => ({ vehicle_id: vehicle.id, storage_path, uploaded_by: user.id })),
        { onConflict: 'storage_path', ignoreDuplicates: true },
      ),
  );
  return json(await listPhotos(vehicle.id), 201);
});
