import { HttpError, json, route } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { findUser } from '@/lib/server/users';
import { createAuthLink, emailAuthLink, type LinkKind } from '@/lib/server/auth-links';

// Email someone a fresh link. People who never set a password get a link to /activate;
// everyone else gets a reset link to /reset-password.
export const POST = route<{ id: string }>(async (req, { id }) => {
  await requireUser(req, 'admin');
  const { user, email, activated } = await findUser(id);

  const kind: LinkKind = !user.email_confirmed_at ? 'invite' : activated ? 'reset' : 'activate';
  // A recovery link also works for an invited account that never signed in, and unlike
  // generateLink('invite') it never creates anything.
  const link = await createAuthLink(kind === 'reset' ? 'reset' : 'activate', email);
  if (link.error) throw new Error(`Could not create link: ${link.error.message}`);
  const sent = await emailAuthLink(kind, email, link.data.properties.action_link);
  if (!sent.ok) throw new HttpError(502, `No email was sent. ${sent.reason} Use “Copy link” under People to share their link directly.`, 'email_failed');
  return json({ email, kind });
});
