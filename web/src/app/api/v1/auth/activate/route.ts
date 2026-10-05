import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { badRequest, must, noContent, readJson, route } from '@/lib/server/http';
import { TERMS_VERSION } from '@/lib/terms';
import { requireUser } from '@/lib/server/auth';
import { AUTH_LIMIT, rateLimit } from '@/lib/server/rate-limit';
import { newPassword } from '@/lib/server/session';

// The invitation email links to APP_URL/activate with an access token. The page posts
// that token here (as a Bearer header) together with the chosen password.
export const POST = route(async req => {
  await rateLimit(req, 'auth', AUTH_LIMIT.limit, AUTH_LIMIT.window);
  const user = await requireUser(req);
  const body = z
    .object({ password: newPassword, fullName: z.string().trim().max(120).optional(), acceptTerms: z.boolean().optional() })
    .parse(await readJson(req));
  // Dealers accept the membership terms when they set up their account.
  if (user.role === 'dealer' && !body.acceptTerms) throw badRequest('Please accept the membership terms to continue');
  const { error } = await admin().auth.admin.updateUserById(user.id, { password: body.password });
  if (error) throw new Error(`Could not set password: ${error.message}`);
  must(
    await admin()
      .from('profiles')
      .update({ activated_at: new Date().toISOString(), ...(body.fullName ? { full_name: body.fullName } : {}) })
      .eq('id', user.id),
  );
  if (body.acceptTerms) {
    // Separate write so activation still works before migration 005 adds these columns.
    const t = await admin().from('profiles').update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION }).eq('id', user.id);
    if (t.error) console.error(`[terms] could not record acceptance: ${t.error.message}`);
  }
  return noContent();
});
