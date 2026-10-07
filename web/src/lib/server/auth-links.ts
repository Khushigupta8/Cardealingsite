import 'server-only';
import { env } from './env';
import { admin } from './supabase';
import { sendEmail } from './email';

// Invitation and password emails. Supabase makes the one-time link (generateLink, which sends
// nothing) and we email it through Resend with the site's layout, so these emails don't depend
// on Supabase's SMTP settings and follow the same test mode as every other email.

export type LinkKind = 'invite' | 'activate' | 'reset';

const page = (kind: LinkKind) => `${env().APP_URL}/${kind === 'reset' ? 'reset-password' : 'activate'}`;

// `invite` creates the account if it doesn't exist yet; the others need an existing account.
export async function createAuthLink(kind: LinkKind, email: string) {
  const options = { redirectTo: page(kind) };
  return kind === 'invite'
    ? admin().auth.admin.generateLink({ type: 'invite', email, options })
    : admin().auth.admin.generateLink({ type: 'recovery', email, options });
}

export async function emailAuthLink(kind: LinkKind, email: string, url: string) {
  const site = env().APP_URL;
  if (kind === 'reset') {
    return sendEmail({
      to: [email],
      subject: 'Your Dealer Review sign-in link',
      preheader: 'Use this link to choose a new password for your Dealer Review account.',
      eyebrow: 'Account security',
      title: ['Choose a', 'new password.'],
      blocks: [{ kind: 'text', text: 'Use the button below to set a new password for your Dealer Review account. This link works once and expires in 24 hours.' }],
      cta: { label: 'Set my password', url },
      note: 'Didn’t ask for this? You can ignore this email; your password won’t change.',
    });
  }
  return sendEmail({
    to: [email],
    subject: 'You’re invited to Dealer Review',
    preheader: 'Your dealership has been invited to a private vehicle review workspace.',
    eyebrow: 'Private invitation',
    title: ['You’re invited.', 'Your workspace awaits.'],
    blocks: [
      { kind: 'text', text: 'Your dealership has been invited to Dealer Review: a private workspace where you submit vehicles and our team returns a considered assessment.' },
      {
        kind: 'details',
        rows: [
          ['Condition rating', 'Yours, from 1 to 5, on every report'],
          ['Listing price', 'A recommended price with perspective'],
          ['Branded report', 'A PDF to keep on file or share'],
        ],
      },
      { kind: 'text', text: 'Set your password to activate your account.' },
    ],
    cta: { label: 'Activate your account', url },
    note: `This link works once and expires in 24 hours. Expired? Get a new one at ${site}/activate`,
  });
}
