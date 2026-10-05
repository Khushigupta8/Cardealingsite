import type Stripe from 'stripe';
import { badRequest, json, route } from '@/lib/server/http';
import { applySubscription, stripe } from '@/lib/server/membership';

export const maxDuration = 30;

// Stripe → Dealer Review: keeps each dealership's membership status current
// (new subscriptions, renewals, failed payments, cancellations).
export const POST = route(async req => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw badRequest('Webhook secret not configured');
  const signature = req.headers.get('stripe-signature');
  if (!signature) throw badRequest('Missing Stripe signature');
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    throw badRequest('Invalid Stripe signature');
  }

  const subscriptionId = (() => {
    const o = event.data.object as { object?: string; id?: string; subscription?: string | { id: string } | null; parent?: { subscription_details?: { subscription?: string | { id: string } } } };
    if (o.object === 'subscription') return o.id;
    const s = o.subscription ?? o.parent?.subscription_details?.subscription;
    return typeof s === 'string' ? s : s?.id;
  })();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
    case 'checkout.session.completed':
    case 'invoice.paid':
    case 'invoice.payment_failed':
      // Stripe doesn't guarantee delivery order, so always re-read the subscription's current state
      // rather than trusting the (possibly older) payload.
      if (subscriptionId) await applySubscription(await stripe().subscriptions.retrieve(subscriptionId));
      break;
  }
  return json({ received: true });
});
