import { admin } from '@/lib/server/supabase';
import { env } from '@/lib/server/env';
import { HttpError, conflict, json, must, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { membershipFor, stripe } from '@/lib/server/membership';

// Start Stripe Checkout for the dealership's agreed plan (card or ACH bank payment).
export const POST = route(async req => {
  const user = await requireUser(req, 'dealer');
  const { dealership: d, state } = await membershipFor(user.dealershipId!);
  if (state.exempt) throw conflict('Your dealership has a complimentary membership');
  if (state.hasSubscription) throw conflict('Your membership is already set up. Use Manage billing to make changes.');
  if (!d.stripe_price_id || !state.plan) {
    throw new HttpError(409, 'Your membership plan hasn’t been set up yet. Your reviewer will confirm it before activation.', 'plan_missing');
  }

  // One Stripe customer per dealership, reused for every checkout and the billing portal.
  let customer = d.stripe_customer_id;
  if (!customer) {
    // Idempotency key: two simultaneous clicks create one customer, not two.
    const c = await stripe().customers.create({ email: user.email, name: d.name, metadata: { dealership_id: d.id } }, { idempotencyKey: `customer-${d.id}` });
    customer = c.id;
    must(await admin().from('dealerships').update({ stripe_customer_id: customer }).eq('id', d.id));
  }

  // Reuse a still-open Checkout for the same plan (second tab, back button) so the dealer can't pay twice.
  const open = await stripe().checkout.sessions.list({ customer, status: 'open', limit: 5, expand: ['data.line_items'] });
  const reusable = open.data.find(s => s.line_items?.data[0]?.price?.id === d.stripe_price_id && s.url);
  for (const s of open.data) if (s !== reusable) await stripe().checkout.sessions.expire(s.id).catch(() => {});
  if (reusable) return json({ url: reusable.url });

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: d.id,
    line_items: [{ price: d.stripe_price_id, quantity: 1 }],
    // Filters what Stripe offers: ACH appears where the account supports it.
    allowed_payment_method_types: ['card', 'us_bank_account'],
    subscription_data: { metadata: { dealership_id: d.id } },
    success_url: `${env().APP_URL}/portal?billing=success`,
    cancel_url: `${env().APP_URL}/portal?billing=cancelled`,
  });
  return json({ url: session.url });
});
