import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { conflict, json, maybe, noContent, notFound, readJson, route, uuid } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { MANUAL_ENQUIRY_STATUSES, toEnquiry } from '@/lib/server/enquiries';

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  uuid(id, 'Enquiry not found');
  const { status } = z.object({ status: z.enum(MANUAL_ENQUIRY_STATUSES) }).parse(await readJson(req));
  const db = admin();
  const current = maybe(await db.from('enquiries').select('status').eq('id', id).maybeSingle());
  if (!current) throw notFound('Enquiry not found');
  // Invited is a record of an invitation that was sent; it isn't undone by hand.
  if (current.status === 'invited') throw conflict('This dealership has already been invited.');
  const row = maybe(await db.from('enquiries').update({ status }).eq('id', id).select('*').maybeSingle());
  if (!row) throw notFound('Enquiry not found');
  return json(toEnquiry(row));
});

export const DELETE = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  uuid(id, 'Enquiry not found');
  const gone = maybe(await admin().from('enquiries').delete().eq('id', id).select('id').maybeSingle());
  if (!gone) throw notFound('Enquiry not found');
  return noContent();
});
