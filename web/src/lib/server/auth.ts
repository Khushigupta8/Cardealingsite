import 'server-only';
import { admin } from './supabase';
import { forbidden, maybe, unauthorized } from './http';

export type Role = 'dealer' | 'reviewer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  dealershipId: string | null;
  token: string;
}

export function bearerToken(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

// Verify the Bearer token and load the caller's role. Optionally restrict to roles.
export async function requireUser(req: Request, ...roles: Role[]): Promise<AuthUser> {
  const token = bearerToken(req);
  if (!token) throw unauthorized();

  const { data, error } = await admin().auth.getUser(token);
  if (error?.code === 'user_banned') throw forbidden('This account has been disabled. Contact the Dealer Review team.');
  if (error || !data.user) {
    console.warn(`[auth] token rejected: status=${error?.status} code=${error?.code} ${error?.message}`);
    throw unauthorized('Session expired or invalid');
  }

  const profile = maybe(
    await admin().from('profiles').select('*').eq('id', data.user.id).maybeSingle(),
  );
  if (!profile) throw forbidden('No account profile. Ask for a new invitation.');
  if (profile.disabled_at) throw forbidden('This account has been disabled. Contact the Dealer Review team.');

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email ?? '',
    role: profile.role,
    dealershipId: profile.dealership_id,
    token,
  };
  if (roles.length && !roles.includes(user.role)) throw forbidden();
  return user;
}
