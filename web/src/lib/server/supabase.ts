import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type --
   untyped rows until `npx supabase gen types typescript` output replaces LooseDatabase. */
// Loose schema until generated types exist (`npx supabase gen types typescript`):
// every row is a plain record.
type AnyTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: [];
};
type LooseDatabase = {
  public: {
    Tables: Record<string, AnyTable>;
    Views: {};
    Functions: Record<string, { Args: Record<string, unknown>; Returns: any }>;
    Enums: {};
    CompositeTypes: {};
  };
};

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

let adminClient: SupabaseClient<LooseDatabase> | undefined;
// Full database and admin-auth access. Server only.
export const admin = () =>
  (adminClient ??= createClient<LooseDatabase>(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, noSession));

// Fresh client per auth call, so one user's sign-in never leaks session state to another request.
export const authClient = () => createClient(env().SUPABASE_URL, env().SUPABASE_ANON_KEY, noSession);
