import { env } from '@/lib/server/env';
import { admin } from '@/lib/server/supabase';
import { json, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { findUser } from '@/lib/server/users';

// Make a sign-in link without sending email, for the admin to pass on (e.g. by WhatsApp) when
// email is slow or rate limited. The link works once and expires like an emailed one.
export const POST = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  const { email, activated } = await findUser(id);
  const page = activated ? 'reset-password' : 'activate';
  const link = await admin().auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${env().APP_URL}/${page}` },
  });
  if (link.error) throw new Error(`Could not create link: ${link.error.message}`);
  return json({ email, url: link.data.properties.action_link, purpose: activated ? 'reset password' : 'set password' });
});
