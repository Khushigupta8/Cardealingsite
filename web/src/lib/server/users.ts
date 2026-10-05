import 'server-only';
import { admin } from './supabase';
import { maybe, notFound, uuid } from './http';

// The auth user and profile behind an id, for admin actions.
export async function findUser(id: string) {
  uuid(id, 'User not found');
  const { data, error } = await admin().auth.admin.getUserById(id);
  if (error || !data.user?.email) throw notFound('User not found');
  const profile = maybe(await admin().from('profiles').select('activated_at').eq('id', id).maybeSingle());
  if (!profile) throw notFound('User not found');
  return { user: data.user, email: data.user.email, activated: !!profile.activated_at };
}

// Look up an account by email (Supabase has no direct lookup; the user list is small).
export async function userIdByEmail(email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not check existing accounts: ${error.message}`);
    const hit = data.users.find(u => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
}
