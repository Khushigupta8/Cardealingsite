import { z } from 'zod';
import { env } from '@/lib/server/env';
import { authClient } from '@/lib/server/supabase';
import { HttpError, noContent, readJson, route } from '@/lib/server/http';
import { AUTH_LIMIT, rateLimit } from '@/lib/server/rate-limit';

// 204 whether or not the email has an account, so it can't be used to discover accounts.
export const POST = route(async req => {
  await rateLimit(req, 'auth', AUTH_LIMIT.limit, AUTH_LIMIT.window);
  const { email } = z.object({ email: z.email() }).parse(await readJson(req));
  const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${env().APP_URL}/reset-password` });
  // The email quota is project-wide, so reporting it does not reveal whether this address has an account.
  if (error?.status === 429) throw new HttpError(429, "We can't send more emails right now. Please try again in an hour.", 'rate_limited');
  return noContent();
});
