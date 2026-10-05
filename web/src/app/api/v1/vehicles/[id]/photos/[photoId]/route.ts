import { env } from '@/lib/server/env';
import { admin } from '@/lib/server/supabase';
import { conflict, maybe, must, noContent, notFound, route, uuid } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { loadVehicle } from '@/lib/server/vehicles';

export const DELETE = route<{ id: string; photoId: string }>(async (req, { id, photoId }) => {
  const user = await requireUser(req, 'dealer');
  await requireActiveMembership(user);
  const vehicle = await loadVehicle(id, user);
  if (vehicle.status === 'completed') throw conflict('Completed reviews cannot be changed');
  uuid(photoId, 'Photo not found');
  const photo = maybe(
    await admin().from('vehicle_photos').select('id, storage_path').eq('id', photoId).eq('vehicle_id', vehicle.id).maybeSingle(),
  );
  if (!photo) throw notFound('Photo not found');
  must(await admin().from('vehicle_photos').delete().eq('id', photo.id));
  await admin().storage.from(env().PHOTO_BUCKET).remove([photo.storage_path]);
  return noContent();
});
