import 'server-only';
import { admin } from './supabase';
import { tooMany } from './http';

// Serverless functions don't share memory, so attempts are counted in Postgres
// (see supabase/migrations/002_rate_limits.sql).
export async function rateLimit(req: Request, bucket: string, limit: number, windowSeconds: number) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  const { data, error } = await admin().rpc('rate_limit_hit', {
    p_key: `${bucket}:${ip}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open: a missing migration must not lock everyone out.
    console.warn(`Rate limit check skipped (${error.message}). Run supabase/migrations/002_rate_limits.sql.`);
    return;
  }
  if (data === false) throw tooMany();
}

export const AUTH_LIMIT = { limit: 20, window: 15 * 60 };
export const REFRESH_LIMIT = { limit: 120, window: 15 * 60 };
