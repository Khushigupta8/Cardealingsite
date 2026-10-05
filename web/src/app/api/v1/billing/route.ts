import { json, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { membershipFor, stripeConfigured } from '@/lib/server/membership';

// The dealer's membership: whether it's required, their agreed plan, and whether they can submit.
export const GET = route(async req => {
  const user = await requireUser(req, 'dealer');
  const { state } = await membershipFor(user.dealershipId!);
  return json({ ...state, billingAvailable: stripeConfigured() });
});
