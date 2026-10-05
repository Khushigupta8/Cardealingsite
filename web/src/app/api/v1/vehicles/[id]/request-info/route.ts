import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { conflict, json, maybe, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { VEHICLE_COLUMNS, asRow, loadVehicle, toVehicle } from '@/lib/server/vehicles';
import { addMessageQuietly } from '@/lib/server/messages';
import { emailsFor, sendEmail } from '@/lib/server/email';
import { after } from 'next/server';

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req, 'reviewer', 'admin');
  const vehicle = await loadVehicle(id, user);
  const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).parse(await readJson(req));
  // Conditional on status so two reviewers can't both act on the same car.
  const row = maybe(
    await admin()
      .from('vehicles')
      .update({ status: 'needs_info', info_request: message })
      .eq('id', vehicle.id)
      .eq('status', 'pending')
      .select(VEHICLE_COLUMNS)
      .maybeSingle(),
  );
  if (!row) throw conflict('Only pending vehicles can be sent back for more information');
  await addMessageQuietly(vehicle, user, message, { notify: false });
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  after(async () =>
    sendEmail({
      to: await emailsFor({ role: 'dealer', dealershipId: vehicle.dealership_id }),
      subject: `More information needed: ${name}`,
      heading: `Your reviewer needs a little more on the ${name}`,
      lines: [`“${message}”`, 'Add what they asked for, then resubmit the vehicle from your workspace.'],
      cta: { label: 'Respond in your workspace', path: '/portal' },
    }),
  );
  return json(toVehicle(asRow(row)));
});
