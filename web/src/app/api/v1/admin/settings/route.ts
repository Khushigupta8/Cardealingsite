import { z } from 'zod';
import { json, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { getSettings, setSetting } from '@/lib/server/settings';
import { stripeConfigured } from '@/lib/server/membership';

const view = async () => {
  const s = await getSettings();
  return { membershipRequired: s.membershipRequired, graceDays: s.graceDays, stripeConfigured: stripeConfigured(), webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET };
};

export const GET = route(async req => {
  await requireUser(req, 'admin');
  return json(await view());
});

// Site-wide membership switch and grace period.
export const PATCH = route(async req => {
  await requireUser(req, 'admin');
  const body = z
    .object({ membershipRequired: z.boolean().optional(), graceDays: z.number().int().min(0).max(60).optional() })
    .parse(await readJson(req));
  if (body.membershipRequired !== undefined) await setSetting('membershipRequired', body.membershipRequired);
  if (body.graceDays !== undefined) await setSetting('graceDays', body.graceDays);
  return json(await view());
});
