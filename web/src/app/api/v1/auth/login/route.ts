import { z } from 'zod';
import { authClient } from '@/lib/server/supabase';
import { forbidden, json, readJson, route, unauthorized } from '@/lib/server/http';
import { AUTH_LIMIT, rateLimit } from '@/lib/server/rate-limit';
import { sessionBody } from '@/lib/server/session';

// Exchange email + password for tokens. Send the access token as "Authorization: Bearer <token>".
export const POST = route(async req => {
  await rateLimit(req, 'auth', AUTH_LIMIT.limit, AUTH_LIMIT.window);
  const { email, password } = z.object({ email: z.email(), password: z.string().min(1) }).parse(await readJson(req));
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error?.code === 'user_banned') throw forbidden('This account has been disabled. Contact the Dealer Review team.');
  if (error || !data.session) throw unauthorized('Email or password is incorrect');
  return json(sessionBody(data.session));
});
