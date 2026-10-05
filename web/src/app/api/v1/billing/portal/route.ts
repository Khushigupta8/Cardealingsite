import { env } from '@/lib/server/env';
import { conflict, json, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { ensurePortalConfig, membershipFor, stripe } from '@/lib/server/membership';

// Stripe billing portal: invoices, payment details, cancel.
export const POST = route(async req => {
  const user = await requireUser(req, 'dealer');
  const { dealership: d } = await membershipFor(user.dealershipId!);
  if (!d.stripe_customer_id) throw conflict('There’s no billing account yet. Activate your membership first.');
  const session = await stripe().billingPortal.sessions.create({
    customer: d.stripe_customer_id,
    configuration: await ensurePortalConfig(),
    return_url: `${env().APP_URL}/portal`,
  });
  return json({ url: session.url });
});
