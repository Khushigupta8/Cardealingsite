import { admin } from '@/lib/server/supabase';
import { json, must, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';

export const GET = route(async req => {
  const user = await requireUser(req);
  const profile = must(
    await admin()
      .from('profiles')
      .select('full_name, activated_at, dealership:dealerships(id, name)')
      .eq('id', user.id)
      .single(),
  );
  return json({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: profile.full_name,
    activatedAt: profile.activated_at,
    dealership: profile.dealership,
  });
});
