import { admin } from '@/lib/server/supabase';
import { noContent, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';

export const POST = route(async req => {
  const user = await requireUser(req);
  // "local" ends only this session; the default (global) would sign the person out on every device.
  await admin().auth.admin.signOut(user.token, 'local');
  return noContent();
});
