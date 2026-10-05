import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { json, must, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { ENQUIRY_STATUSES, toEnquiry } from '@/lib/server/enquiries';

export const GET = route(async req => {
  await requireUser(req, 'admin');
  const { status } = z.object({ status: z.enum(ENQUIRY_STATUSES).optional() }).parse(Object.fromEntries(new URL(req.url).searchParams));
  const db = admin();
  let q = db.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200);
  if (status) q = q.eq('status', status);
  const [rows, ...counts] = await Promise.all([
    q,
    ...ENQUIRY_STATUSES.map(s => db.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', s)),
  ]);
  counts.forEach(must);
  return json({
    items: must(rows).map(toEnquiry),
    counts: Object.fromEntries(ENQUIRY_STATUSES.map((s, i) => [s, counts[i].count ?? 0])),
  });
});
