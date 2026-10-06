import { z } from 'zod';
import { noContent, readJson, route } from '@/lib/server/http';
import { AUTH_LIMIT, rateLimit } from '@/lib/server/rate-limit';
import { createAuthLink, emailAuthLink } from '@/lib/server/auth-links';

// 204 whether or not the email has an account, so it can't be used to discover accounts.
export const POST = route(async req => {
  await rateLimit(req, 'auth', AUTH_LIMIT.limit, AUTH_LIMIT.window);
  const { email } = z.object({ email: z.email() }).parse(await readJson(req));
  // Fails for an address without an account; nothing is sent then, and the reply is the same.
  const link = await createAuthLink('reset', email);
  if (link.error) {
    if (link.error.status !== 404 && !/not.?found/i.test(link.error.message)) console.error(`[auth] reset link not created: ${link.error.message}`);
    return noContent();
  }
  // Still 204 to the caller, but a broken mail setup must not fail silently.
  const sent = await emailAuthLink('reset', email, link.data.properties.action_link);
  if (!sent.ok) console.error(`[auth] reset email not sent: ${sent.reason}`);
  return noContent();
});
