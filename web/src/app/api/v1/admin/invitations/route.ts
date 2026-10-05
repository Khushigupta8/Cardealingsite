import { z } from 'zod';
import { env } from '@/lib/server/env';
import { admin } from '@/lib/server/supabase';
import { HttpError, badRequest, conflict, json, maybe, must, notFound, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { userIdByEmail } from '@/lib/server/users';

const invitation = z.object({
  email: z.email(),
  role: z.enum(['dealer', 'reviewer', 'admin']).default('dealer'),
  // Dealers join an existing dealership, or a new one is created from the name.
  dealershipId: z.uuid().optional(),
  dealershipName: z.string().trim().min(1).max(160).optional(),
});

// Invite-only signup: creates the account and emails an activation link to APP_URL/activate.
export const POST = route(async req => {
  await requireUser(req, 'admin');
  const body = invitation.parse(await readJson(req));
  const db = admin();
  // Check first, so an existing account never gets a second invitation email or a stray dealership.
  if (await userIdByEmail(body.email)) throw conflict('This email already has an account. Use Resend invite or Copy link under People.');

  let dealershipId: string | null = null;
  if (body.role === 'dealer') {
    if (body.dealershipId) {
      const found = maybe(await db.from('dealerships').select('id').eq('id', body.dealershipId).maybeSingle());
      if (!found) throw notFound('Dealership not found');
      // "One dealership login": a dealership gets a single dealer account.
      const existing = must(await db.from('profiles').select('id').eq('dealership_id', body.dealershipId).eq('role', 'dealer'));
      if (existing.length) throw conflict('This dealership already has a login');
      dealershipId = found.id;
    } else if (body.dealershipName) {
      dealershipId = must(await db.from('dealerships').insert({ name: body.dealershipName }).select('id').single()).id;
    } else {
      throw badRequest('Dealer invitations need dealershipId or dealershipName');
    }
  }
  const createdDealership = dealershipId && !body.dealershipId ? dealershipId : null;

  const { data, error } = await db.auth.admin.inviteUserByEmail(body.email, { redirectTo: `${env().APP_URL}/activate` });
  if (error || !data.user) {
    if (createdDealership) await db.from('dealerships').delete().eq('id', createdDealership);
    if (error?.status === 422) throw conflict('An account with this email already exists');
    if (error?.status === 429) throw new HttpError(429, 'Too many emails sent recently. Try again in a little while.', 'rate_limited');
    throw new Error(`Invitation failed: ${error?.message}`);
  }

  // Supabase re-sends the invite for an address that was already invited (and returns that
  // existing user). Never touch an account this request didn't create.
  const existing = maybe(await db.from('profiles').select('id').eq('id', data.user.id).maybeSingle());
  if (existing) {
    if (createdDealership) await db.from('dealerships').delete().eq('id', createdDealership);
    throw conflict('This email already has an account. Use Resend invite or Copy link under People.');
  }

  const created = await db.from('profiles').insert({ id: data.user.id, role: body.role, dealership_id: dealershipId });
  if (created.error) {
    // Roll back so the email can be invited again (only reached for a user created just now).
    await db.auth.admin.deleteUser(data.user.id);
    if (createdDealership) await db.from('dealerships').delete().eq('id', createdDealership);
    throw new Error(`Invitation failed: ${created.error.message}`);
  }

  return json({ userId: data.user.id, email: body.email, role: body.role, dealershipId }, 201);
});
