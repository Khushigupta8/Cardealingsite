import { admin } from '@/lib/server/supabase';
import { json, must, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';

// Everyone with an account: who they are, their role, and whether they have activated.
export const GET = route(async req => {
  await requireUser(req, 'admin');
  const profiles = must(
    await admin().from('profiles').select('*, dealership:dealerships(id, name)'),
  );
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    data.users.forEach(u => emails.set(u.id, u.email ?? ''));
    if (data.users.length < 1000) break;
  }
  return json(
    profiles
      .map(p => ({
        id: p.id as string,
        email: emails.get(p.id) ?? null,
        role: p.role,
        fullName: p.full_name,
        dealership: p.dealership,
        activatedAt: p.activated_at,
        disabledAt: (p.disabled_at as string | null) ?? null,
        termsAcceptedAt: (p.terms_accepted_at as string | null) ?? null,
        invitedAt: p.created_at as string,
      }))
      .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt)),
  );
});
