import { z } from 'zod';
import { json, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { getSettings, setSetting } from '@/lib/server/settings';
import { priceFor, standardPlan, stripeConfigured } from '@/lib/server/membership';

const view = async () => {
  const s = await getSettings();
  return {
    membershipRequired: s.membershipRequired,
    graceDays: s.graceDays,
    standardPlan: standardPlan(s),
    stripeConfigured: stripeConfigured(),
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  };
};

export const GET = route(async req => {
  await requireUser(req, 'admin');
  return json(await view());
});

// Site-wide membership switch, grace period and the standard plan.
export const PATCH = route(async req => {
  await requireUser(req, 'admin');
  const body = z
    .object({
      membershipRequired: z.boolean().optional(),
      graceDays: z.number().int().min(0).max(60).optional(),
      // Dollars. Applies to new checkouts; existing subscribers keep the price they signed up at.
      standardPlan: z.object({ amount: z.number().positive().max(100_000), interval: z.enum(['month', 'year']) }).optional(),
    })
    .parse(await readJson(req));
  if (body.membershipRequired !== undefined) await setSetting('membershipRequired', body.membershipRequired);
  if (body.graceDays !== undefined) await setSetting('graceDays', body.graceDays);
  if (body.standardPlan) {
    const cents = Math.round(body.standardPlan.amount * 100);
    const current = await getSettings();
    if (cents !== current.standardPlanCents || body.standardPlan.interval !== current.standardPlanInterval || !current.standardPriceId) {
      const priceId = await priceFor(cents, body.standardPlan.interval, 'Standard plan');
      await setSetting('standardPriceId', priceId);
      await setSetting('standardPlanCents', cents);
      await setSetting('standardPlanInterval', body.standardPlan.interval);
    }
  }
  return json(await view());
});
