import 'server-only';
import { z } from 'zod';

export const sessionBody = (s: { access_token: string; refresh_token: string; expires_at?: number }) => ({
  accessToken: s.access_token,
  refreshToken: s.refresh_token,
  expiresAt: s.expires_at ?? null,
});

export const newPassword = z.string().min(10, 'Use at least 10 characters').max(128);
