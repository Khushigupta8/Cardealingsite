import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { noContent, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { AUTH_LIMIT, rateLimit } from '@/lib/server/rate-limit';
import { newPassword } from '@/lib/server/session';

// Set a new password while signed in, or with the token from a reset email.
export const POST = route(async req => {
  await rateLimit(req, 'auth', AUTH_LIMIT.limit, AUTH_LIMIT.window);
  const user = await requireUser(req);
  const body = z.object({ password: newPassword }).parse(await readJson(req));
  const { error } = await admin().auth.admin.updateUserById(user.id, { password: body.password });
  if (error) throw new Error(`Could not set password: ${error.message}`);
  return noContent();
});
