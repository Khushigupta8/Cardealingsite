import { z } from 'zod';
import { authClient } from '@/lib/server/supabase';
import { json, readJson, route, unauthorized } from '@/lib/server/http';
import { REFRESH_LIMIT, rateLimit } from '@/lib/server/rate-limit';
import { sessionBody } from '@/lib/server/session';

export const POST = route(async req => {
  await rateLimit(req, 'refresh', REFRESH_LIMIT.limit, REFRESH_LIMIT.window);
  const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(await readJson(req));
  const { data, error } = await authClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    console.warn(`[auth] refresh rejected: status=${error?.status} code=${error?.code} ${error?.message}`);
    throw unauthorized('Session expired. Sign in again.');
  }
  return json(sessionBody(data.session));
});
