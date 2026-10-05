import { json, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { membershipFor, stripeConfigured, syncDealership } from '@/lib/server/membership';

// Refresh the dealership's subscription from Stripe, e.g. right after returning from Checkout,
// so the workspace updates even before (or without) the webhook arriving.
export const POST = route(async req => {
  const user = await requireUser(req, 'dealer');
  if (stripeConfigured()) await syncDealership(user.dealershipId!);
  const { state } = await membershipFor(user.dealershipId!);
  return json({ ...state, billingAvailable: stripeConfigured() });
});
