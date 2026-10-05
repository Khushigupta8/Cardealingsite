import { admin } from '@/lib/server/supabase';
import { json, must, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';

export const GET = route(async req => {
  await requireUser(req, 'admin');
  const rows = must(await admin().from('dealerships').select('id, name, created_at').order('name'));
  return json(rows.map(d => ({ id: d.id, name: d.name, createdAt: d.created_at })));
});
