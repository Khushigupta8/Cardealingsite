import 'server-only';

export const ENQUIRY_STATUSES = ['new', 'contacted', 'invited', 'closed'] as const;
// What an admin can set by hand. "invited" is only set when an invitation is actually sent
// from the enquiry (POST /admin/invitations with enquiryId), so it is always true.
export const MANUAL_ENQUIRY_STATUSES = ['new', 'contacted', 'closed'] as const;

export const toEnquiry = (e: Record<string, unknown>) => ({
  id: e.id as string,
  name: e.name as string,
  dealership: e.dealership as string,
  email: e.email as string,
  phone: e.phone as string | null,
  location: e.location as string | null,
  monthlyVolume: e.monthly_volume as string | null,
  message: e.message as string | null,
  status: e.status as (typeof ENQUIRY_STATUSES)[number],
  createdAt: e.created_at as string,
  updatedAt: e.updated_at as string,
});
