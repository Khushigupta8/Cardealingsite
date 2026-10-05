import { z } from 'zod';
import { env } from '@/lib/server/env';
import { admin } from '@/lib/server/supabase';
import { badRequest, conflict, json, maybe, must, notFound, readJson, route, uuid } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { getSettings } from '@/lib/server/settings';
import { membershipState, priceFor, stripe, type DealershipBilling } from '@/lib/server/membership';

// Rename a dealership, set its agreed plan (amount + monthly/yearly) and complimentary status.
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  uuid(id, 'Dealership not found');
  const body = z
    .object({
      planAmount: z.number().positive().max(100_000).optional(), // dollars
      planInterval: z.enum(['month', 'year']).optional(),
      billingExempt: z.boolean().optional(),
      name: z.string().trim().min(1, 'Enter the dealership name').max(160).optional(),
    })
    .parse(await readJson(req));
  const db = admin();
  const d = maybe(await db.from('dealerships').select('*').eq('id', id).maybeSingle()) as DealershipBilling | null;
  if (!d) throw notFound('Dealership not found');

  const changes: Record<string, unknown> = {};
  if (body.billingExempt !== undefined) changes.billing_exempt = body.billingExempt;
  if (body.name !== undefined && body.name !== d.name) {
    changes.name = body.name;
    // Keep the Stripe customer's name in step, so invoices show the right dealership.
    if (d.stripe_customer_id) await stripe().customers.update(d.stripe_customer_id, { name: body.name }).catch(() => {});
  }

  if (body.planAmount !== undefined || body.planInterval !== undefined) {
    const amountCents = Math.round((body.planAmount ?? (d.plan_amount_cents ?? 0) / 100) * 100);
    const interval = body.planInterval ?? d.plan_interval;
    if (!amountCents || !interval) throw badRequest('Set both the amount and how often it’s billed');
    if (amountCents !== d.plan_amount_cents || interval !== d.plan_interval || !d.stripe_price_id) {
      const priceId = await priceFor(amountCents, interval, d.name);
      Object.assign(changes, { plan_amount_cents: amountCents, plan_interval: interval, stripe_price_id: priceId });
      // Already subscribed: switch the subscription to the new price from the next bill (no proration).
      if (d.stripe_subscription_id && d.subscription_status && !['canceled', 'incomplete_expired'].includes(d.subscription_status)) {
        const sub = await stripe().subscriptions.retrieve(d.stripe_subscription_id);
        const item = sub.items.data[0];
        if (item) {
          await stripe().subscriptions.update(sub.id, { items: [{ id: item.id, price: priceId }], proration_behavior: 'none' });
        }
      }
    }
  }

  if (Object.keys(changes).length) must(await db.from('dealerships').update(changes).eq('id', id));
  const updated = must(await db.from('dealerships').select('*').eq('id', id).single()) as DealershipBilling;
  return json({ id, name: updated.name, ...membershipState(updated, await getSettings()) });
});

// Permanently delete a dealership and everything that belongs to it: its sign-in accounts,
// vehicles, reviews, messages and photos. Any live Stripe subscription is cancelled first, and
// nothing is deleted if that fails, so a removed dealer is never billed again.
export const DELETE = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  uuid(id, 'Dealership not found');
  const db = admin();
  const d = maybe(await db.from('dealerships').select('*').eq('id', id).maybeSingle()) as DealershipBilling | null;
  if (!d) throw notFound('Dealership not found');

  const people = must(await db.from('profiles').select('id, role').eq('dealership_id', id));
  if (people.some(p => p.role !== 'dealer')) throw conflict('A reviewer or admin is linked to this dealership. Move them first.');

  if (d.stripe_subscription_id && d.subscription_status && !['canceled', 'incomplete_expired'].includes(d.subscription_status)) {
    try {
      await stripe().subscriptions.cancel(d.stripe_subscription_id);
    } catch (err) {
      // Already cancelled in Stripe is fine; anything else stops the delete.
      if ((err as { code?: string }).code !== 'resource_missing') {
        throw conflict(`Couldn’t cancel the Stripe subscription, so nothing was deleted: ${(err as Error).message}`);
      }
    }
  }

  // Photo files live under "<dealership>/<vehicle>/". Collect them before the rows go.
  const bucket = db.storage.from(env().PHOTO_BUCKET);
  const vehicleIds = must(await db.from('vehicles').select('id').eq('dealership_id', id)).map(v => v.id as string);
  const paths = new Set<string>();
  if (vehicleIds.length) {
    const rows = must(await db.from('vehicle_photos').select('storage_path').in('vehicle_id', vehicleIds));
    rows.forEach(r => paths.add(r.storage_path as string));
  }
  // Also sweep the folders, which catches uploads that were never attached to a vehicle.
  for (const folder of new Set([...vehicleIds, ...((await bucket.list(id, { limit: 1000 })).data ?? []).map(f => f.name)])) {
    for (const f of (await bucket.list(`${id}/${folder}`, { limit: 1000 })).data ?? []) paths.add(`${id}/${folder}/${f.name}`);
  }

  // Accounts first: profiles are removed with their auth user, and a dealership with profiles can't be deleted.
  for (const p of people) {
    const { error } = await db.auth.admin.deleteUser(p.id as string);
    if (error && !/not.?found/i.test(error.message)) throw new Error(`Could not delete account ${p.id}: ${error.message}`);
  }
  // Vehicles, photo rows, reviews and messages cascade from the dealership.
  must(await db.from('dealerships').delete().eq('id', id).select('id'));

  let filesLeft = 0;
  const list = [...paths];
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await bucket.remove(list.slice(i, i + 100));
    if (error) filesLeft += Math.min(100, list.length - i);
  }
  if (filesLeft) console.error(`Dealership ${id} deleted but ${filesLeft} photo files could not be removed from storage`);

  return json({ id, name: d.name, accounts: people.length, vehicles: vehicleIds.length, photos: list.length - filesLeft, filesLeft });
});
