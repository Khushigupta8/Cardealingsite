import 'server-only';
import Stripe from 'stripe';
import { env } from './env';
import { admin } from './supabase';
import { HttpError, must } from './http';
import { getSettings, setSetting, type Settings } from './settings';
import type { AuthUser } from './auth';

// ---------- Stripe client ----------
let client: Stripe | undefined;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, 'Billing is not set up yet. Add STRIPE_SECRET_KEY.', 'billing_unconfigured');
  return (client ??= new Stripe(key));
}
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

// ---------- Membership state ----------
export type DealershipBilling = {
  id: string;
  name: string;
  plan_amount_cents: number | null;
  plan_interval: 'month' | 'year' | null;
  stripe_price_id: string | null;
  billing_exempt: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  past_due_since: string | null;
};

export type MembershipState = ReturnType<typeof membershipState>;

// Can this dealership submit and update vehicles right now?
export function membershipState(d: DealershipBilling, s: Settings, now = Date.now()) {
  const status = d.subscription_status;
  const graceEndsAt =
    status === 'past_due' && d.past_due_since ? new Date(new Date(d.past_due_since).getTime() + s.graceDays * 864e5).toISOString() : null;
  const subscribed = status === 'active' || status === 'trialing';
  const inGrace = !!graceEndsAt && now < new Date(graceEndsAt).getTime();
  const exempt = !!d.billing_exempt;
  const active = !s.membershipRequired || exempt || subscribed || inGrace;
  return {
    required: s.membershipRequired,
    exempt,
    status,
    active,
    inGrace,
    graceEndsAt,
    currentPeriodEnd: d.current_period_end,
    cancelAtPeriodEnd: !!d.cancel_at_period_end,
    plan: d.plan_amount_cents && d.plan_interval ? { amountCents: d.plan_amount_cents, interval: d.plan_interval } : null,
    // Only a live subscription can be managed in the portal; otherwise the dealer checks out again.
    hasSubscription: !!d.stripe_subscription_id && ['active', 'trialing', 'past_due', 'unpaid'].includes(status ?? ''),
    hasCustomer: !!d.stripe_customer_id,
  };
}

export async function loadDealershipBilling(id: string) {
  return must(await admin().from('dealerships').select('*').eq('id', id).single()) as DealershipBilling;
}

export async function membershipFor(dealershipId: string) {
  const [d, s] = await Promise.all([loadDealershipBilling(dealershipId), getSettings()]);
  return { dealership: d, state: membershipState(d, s), settings: s };
}

// Dealer actions that need an active membership (submitting, editing, photos, replies).
// Viewing vehicles, downloading reports and billing stay available.
export async function requireActiveMembership(user: AuthUser) {
  if (user.role !== 'dealer' || !user.dealershipId) return;
  const s = await getSettings();
  if (!s.membershipRequired) return;
  const d = await loadDealershipBilling(user.dealershipId);
  if (!membershipState(d, s).active) {
    throw new HttpError(402, 'Your membership is not active. Activate or update it to submit and update vehicles.', 'membership_inactive');
  }
}

// ---------- Stripe catalogue ----------
// One "Dealer Review membership" product; each dealership gets its own agreed price.
async function ensureProduct(s: Settings) {
  if (s.stripeProductId) return s.stripeProductId;
  const product = await stripe().products.create({ name: 'Dealer Review membership', metadata: { app: 'dealer-review' } });
  await setSetting('stripeProductId', product.id);
  return product.id;
}

export async function priceFor(amountCents: number, interval: 'month' | 'year', dealershipName: string) {
  const s = await getSettings();
  const product = await ensureProduct(s);
  const price = await stripe().prices.create({
    product,
    currency: 'usd',
    unit_amount: amountCents,
    recurring: { interval },
    nickname: `${dealershipName} · ${interval === 'month' ? 'monthly' : 'yearly'}`,
  });
  return price.id;
}

// Billing portal: invoices, payment details and cancellation (created once, via the API).
export async function ensurePortalConfig() {
  const s = await getSettings();
  if (s.stripePortalConfigId) return s.stripePortalConfigId;
  const config = await stripe().billingPortal.configurations.create({
    business_profile: { headline: 'Dealer Review membership' },
    default_return_url: `${env().APP_URL}/portal`,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'address', 'name'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  });
  await setSetting('stripePortalConfigId', config.id);
  return config.id;
}

// ---------- Sync from Stripe ----------
const LIVE: string[] = ['active', 'trialing', 'past_due', 'unpaid'];
const iso = (sec: number | null | undefined) => (sec ? new Date(sec * 1000).toISOString() : null);

// Copy a subscription's state onto its dealership (from webhooks or after checkout).
export async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const db = admin();
  const byMeta = sub.metadata?.dealership_id;
  const { data: rows } = byMeta
    ? await db.from('dealerships').select('*').eq('id', byMeta)
    : await db.from('dealerships').select('*').eq('stripe_customer_id', customerId);
  const d = rows?.[0] as DealershipBilling | undefined;
  if (!d) return null;
  // Events for a different subscription than the stored one only take over if that one is live;
  // otherwise a stray or abandoned subscription could overwrite a paying dealer.
  if (d.stripe_subscription_id && d.stripe_subscription_id !== sub.id && !LIVE.includes(sub.status)) return d.id;

  const periodEnd = Math.max(0, ...sub.items.data.map(i => i.current_period_end ?? 0));
  const pastDueSince = sub.status === 'past_due' ? (d.subscription_status === 'past_due' && d.past_due_since ? d.past_due_since : new Date().toISOString()) : null;
  must(
    await db
      .from('dealerships')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        current_period_end: iso(periodEnd),
        cancel_at_period_end: sub.cancel_at_period_end || !!sub.cancel_at,
        past_due_since: pastDueSince,
      })
      .eq('id', d.id),
  );
  return d.id;
}

// Pull the latest subscription for a dealership straight from Stripe (no webhook needed).
export async function syncDealership(dealershipId: string) {
  const d = await loadDealershipBilling(dealershipId);
  if (!d.stripe_customer_id) return;
  const subs = await stripe().subscriptions.list({ customer: d.stripe_customer_id, status: 'all', limit: 5 });
  const byNewest = subs.data.sort((a, b) => b.created - a.created);
  const pick = byNewest.find(s => LIVE.includes(s.status)) ?? byNewest[0];
  if (pick) await applySubscription(pick);
}
