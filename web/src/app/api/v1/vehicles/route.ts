import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { json, must, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { requireActiveMembership } from '@/lib/server/membership';
import { unreadFor } from '@/lib/server/messages';
import { STATUSES, VEHICLE_COLUMNS, asRow, scoped, toColumns, toVehicle, vehicleFields } from '@/lib/server/vehicles';

// List with status tab, search and per-status counts (for the Pending / Needs info / Completed tabs).
export const GET = route(async req => {
  const user = await requireUser(req);
  const query = z
    .object({
      status: z.enum(STATUSES).optional(),
      q: z.string().trim().max(80).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      offset: z.coerce.number().int().min(0).default(0),
    })
    .parse(Object.fromEntries(new URL(req.url).searchParams));

  const db = admin();
  let list = scoped(db.from('vehicles').select(VEHICLE_COLUMNS, { count: 'exact' }), user);
  if (query.status) list = list.eq('status', query.status);
  // Strip characters that have meaning in PostgREST filter syntax.
  const q = query.q?.replace(/[%,()*\\.:]/g, ' ').trim();
  if (q) list = list.or(['make', 'model', 'trim', 'vin'].map(c => `${c}.ilike.%${q}%`).join(','));
  // Reviewers work oldest-first through the queue; dealers see newest first.
  list = list.order('submitted_at', { ascending: user.role !== 'dealer' }).range(query.offset, query.offset + query.limit - 1);

  const [result, ...counts] = await Promise.all([
    list,
    ...STATUSES.map(s => scoped(db.from('vehicles').select('id', { count: 'exact', head: true }), user).eq('status', s)),
  ]);
  const rows = must(result);
  counts.forEach(must);

  const items = rows.map(r => toVehicle(asRow(r)));
  const unread = new Map((await unreadFor(user, items.map(v => v.id))).map(u => [u.vehicleId, u.count]));

  return json({
    items: items.map(v => ({ ...v, unread: unread.get(v.id) ?? 0 })),
    total: result.count ?? 0,
    counts: Object.fromEntries(STATUSES.map((s, i) => [s, counts[i].count ?? 0])),
  });
});

export const POST = route(async req => {
  const user = await requireUser(req, 'dealer');
  await requireActiveMembership(user);
  const body = vehicleFields.parse(await readJson(req));
  const row = must(
    await admin()
      .from('vehicles')
      .insert({ ...toColumns(body), dealership_id: user.dealershipId, submitted_by: user.id })
      .select(VEHICLE_COLUMNS)
      .single(),
  );
  return json(toVehicle(asRow(row)), 201);
});
