import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { json, maybe, notFound, readJson, route, uuid } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { ENQUIRY_STATUSES, toEnquiry } from '@/lib/server/enquiries';

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  uuid(id, 'Enquiry not found');
  const { status } = z.object({ status: z.enum(ENQUIRY_STATUSES) }).parse(await readJson(req));
  const row = maybe(await admin().from('enquiries').update({ status }).eq('id', id).select('*').maybeSingle());
  if (!row) throw notFound('Enquiry not found');
  return json(toEnquiry(row));
});
