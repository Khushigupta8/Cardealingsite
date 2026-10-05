import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { conflict, json, maybe, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { VEHICLE_COLUMNS, asRow, loadVehicle, toVehicle } from '@/lib/server/vehicles';
import { addMessageQuietly } from '@/lib/server/messages';

// Dealer has answered a "needs info" request: back into the review queue.
export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req, 'dealer');
  await requireActiveMembership(user);
  const vehicle = await loadVehicle(id, user);
  if (vehicle.status !== 'needs_info') throw conflict('Only vehicles marked "Needs info" can be resubmitted');
  // Optional reply to the reviewer, kept on the vehicle's thread.
  const { note } = z.object({ note: z.string().trim().max(4000).optional() }).parse(await readJson(req));
  const row = maybe(
    await admin()
      .from('vehicles')
      .update({ status: 'pending', info_request: null })
      .eq('id', vehicle.id)
      .eq('status', 'needs_info')
      .select(VEHICLE_COLUMNS)
      .maybeSingle(),
  );
  // A double click: the first resubmit already went through.
  if (!row) throw conflict('This vehicle is already back in the review queue');
  if (note) await addMessageQuietly(vehicle, user, note);
  return json(toVehicle(asRow(row)));
});
