import 'server-only';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Where invitation and password-reset emails send people. On Vercel this falls back to the deployment's URL.
  APP_URL: z.url().optional(),
  PHOTO_BUCKET: z.string().default('vehicle-photos'),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment. Set the variables from .env.example.\n${z.prettifyError(parsed.error)}`);
  }
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const appUrl = parsed.data.APP_URL ?? (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000');
  return { ...parsed.data, APP_URL: appUrl.replace(/\/$/, '') };
}

let cached: ReturnType<typeof load> | undefined;
// Read lazily so `next build` doesn't need secrets.
export const env = () => (cached ??= load());
