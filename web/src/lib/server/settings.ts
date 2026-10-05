import 'server-only';
import { admin } from './supabase';

// Site-wide switches stored in app_settings (migration 004). Defaults apply until it exists.
export type Settings = {
  membershipRequired: boolean;
  graceDays: number;
  stripeProductId?: string;
  stripePortalConfigId?: string;
  // Standard plan: what any dealership without its own agreed price pays.
  standardPlanCents?: number;
  standardPlanInterval?: 'month' | 'year';
  standardPriceId?: string;
};

const KEYS: Record<keyof Settings, string> = {
  membershipRequired: 'membership_required',
  graceDays: 'grace_days',
  stripeProductId: 'stripe_product_id',
  stripePortalConfigId: 'stripe_portal_config_id',
  standardPlanCents: 'standard_plan_cents',
  standardPlanInterval: 'standard_plan_interval',
  standardPriceId: 'standard_price_id',
};

export async function getSettings(): Promise<Settings> {
  const { data } = await admin().from('app_settings').select('key, value');
  const map = new Map((data ?? []).map(r => [r.key as string, r.value]));
  return {
    membershipRequired: map.get(KEYS.membershipRequired) === true,
    graceDays: Number(map.get(KEYS.graceDays) ?? 7),
    stripeProductId: (map.get(KEYS.stripeProductId) as string) || undefined,
    stripePortalConfigId: (map.get(KEYS.stripePortalConfigId) as string) || undefined,
    standardPlanCents: Number(map.get(KEYS.standardPlanCents)) || undefined,
    standardPlanInterval: (map.get(KEYS.standardPlanInterval) as 'month' | 'year') || undefined,
    standardPriceId: (map.get(KEYS.standardPriceId) as string) || undefined,
  };
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const { error } = await admin()
    .from('app_settings')
    .upsert({ key: KEYS[key], value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save setting: ${error.message}. Has migration 004 been run?`);
}
