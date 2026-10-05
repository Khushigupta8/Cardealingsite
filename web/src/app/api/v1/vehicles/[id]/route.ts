import { admin } from '@/lib/server/supabase';
import { badRequest, conflict, json, maybe, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { VEHICLE_COLUMNS, asRow, getReview, listPhotos, loadVehicle, toColumns, toVehicle, vehicleFields } from '@/lib/server/vehicles';

export const GET = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req);
  const vehicle = await loadVehicle(id, user);
  const [photos, review] = await Promise.all([listPhotos(vehicle.id), getReview(vehicle.id)]);
  return json({ ...toVehicle(vehicle), photos, review });
});

// Dealers can correct details until the review is completed.
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req, 'dealer');
  await requireActiveMembership(user);
  const vehicle = await loadVehicle(id, user);
  if (vehicle.status === 'completed') throw conflict('Completed reviews cannot be edited');
  const changes = toColumns(vehicleFields.partial().parse(await readJson(req)));
  if (!Object.keys(changes).length) throw badRequest('Nothing to update');
  // Conditional, so an edit can't land after the review was completed in the meantime.
  const row = maybe(
    await admin().from('vehicles').update(changes).eq('id', vehicle.id).neq('status', 'completed').select(VEHICLE_COLUMNS).maybeSingle(),
  );
  if (!row) throw conflict('This review was completed while you were editing. Your changes were not saved.');
  return json(toVehicle(asRow(row)));
});
