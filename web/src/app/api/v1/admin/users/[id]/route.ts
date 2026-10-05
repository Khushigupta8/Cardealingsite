import { z } from 'zod';
import { admin } from '@/lib/server/supabase';
import { badRequest, conflict, json, must, readJson, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { findUser } from '@/lib/server/users';

// Disable or re-enable an account. Disabled people are refused on every request straight away
// (even with a session still open) and banned at the auth level so they can't sign in or refresh.
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const me = await requireUser(req, 'admin');
  const { disabled } = z.object({ disabled: z.boolean() }).parse(await readJson(req));
  if (id === me.id) throw badRequest("You can't disable your own account");
  await findUser(id);
  const db = admin();

  if (disabled) {
    const target = must(await db.from('profiles').select('role').eq('id', id).single());
    if (target.role === 'admin') {
      const admins = must(await db.from('profiles').select('*').eq('role', 'admin'));
      if (admins.filter(a => !a.disabled_at && a.id !== id).length === 0) throw conflict('At least one admin must stay active');
    }
  }

  const { error } = await db.auth.admin.updateUserById(id, { ban_duration: disabled ? '876000h' : 'none' });
  if (error) throw new Error(`Could not update sign-in access: ${error.message}`);
  const updated = await db.from('profiles').update({ disabled_at: disabled ? new Date().toISOString() : null }).eq('id', id);
  if (updated.error) {
    // Keep auth and profile in step if the profile column is missing (migration 003 not run).
    await db.auth.admin.updateUserById(id, { ban_duration: 'none' });
    throw new Error(`Could not update account: ${updated.error.message}. Has migration 003 been run?`);
  }
  return json({ id, disabled });
});
