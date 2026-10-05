import { env } from '@/lib/server/env';
import { admin, authClient } from '@/lib/server/supabase';
import { json, route } from '@/lib/server/http';
import { emailFailure } from '@/lib/server/auth-email';
import { requireUser } from '@/lib/server/auth';
import { findUser } from '@/lib/server/users';

// Email someone a fresh link. People who never set a password get a link to /activate;
// everyone else gets a reset link to /reset-password.
export const POST = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  const { user, email, activated } = await findUser(id);

  let kind: 'invite' | 'activate' | 'reset';
  let sent;
  if (!user.email_confirmed_at) {
    kind = 'invite';
    sent = await admin().auth.admin.inviteUserByEmail(email, { redirectTo: `${env().APP_URL}/activate` });
  } else {
    kind = activated ? 'reset' : 'activate';
    sent = await authClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${env().APP_URL}/${kind === 'reset' ? 'reset-password' : 'activate'}`,
    });
  }
  if (sent.error) throw emailFailure(sent.error) ?? new Error(`Could not send link: ${sent.error.message}`);
  return json({ email, kind });
});
