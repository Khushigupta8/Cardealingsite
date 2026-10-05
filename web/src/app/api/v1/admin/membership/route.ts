import { admin } from '@/lib/server/supabase';
import { json, must, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { getSettings } from '@/lib/server/settings';
import { membershipState, type DealershipBilling } from '@/lib/server/membership';

// Every dealership with its agreed plan and current membership state.
export const GET = route(async req => {
  await requireUser(req, 'admin');
  const [rows, settings] = await Promise.all([admin().from('dealerships').select('*').order('name'), getSettings()]);
  return json(
    must(rows).map(r => {
      const d = r as DealershipBilling;
      return { id: d.id, name: d.name, ...membershipState(d, settings) };
    }),
  );
});
