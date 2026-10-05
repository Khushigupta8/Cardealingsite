import { z } from 'zod';
import { json, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { loadVehicle } from '@/lib/server/vehicles';
import { addMessage, listMessages, markRead } from '@/lib/server/messages';

// The conversation between the dealership and the review team about one vehicle.
export const GET = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req);
  const vehicle = await loadVehicle(id, user);
  const messages = await listMessages(vehicle.id);
  await markRead(vehicle.id, user);
  return json(messages);
});

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req);
  await requireActiveMembership(user);
  const vehicle = await loadVehicle(id, user);
  const { body } = z.object({ body: z.string().trim().min(1, 'Write a message').max(4000) }).parse(await readJson(req));
  return json(await addMessage(vehicle, user, body), 201);
});
