// Writes the Supabase auth email templates (supabase/email-templates/*.html) from the same
// layout as the app's own emails, so every email matches the website.
// Usage: npm run email-templates, then paste each file into Supabase → Authentication → Emails.
import fs from 'node:fs';
import { renderEmail, type EmailContent } from '../src/lib/server/email-layout.ts';

// Supabase fills these in when it sends.
const SITE = '{{ .SiteURL }}';
const LINK = '{{ .ConfirmationURL }}';

const templates: { file: string; menu: string; subject: string; content: EmailContent }[] = [
  {
    file: 'invite.html',
    menu: 'Invite user',
    subject: 'You’re invited to Dealer Review',
    content: {
      preheader: 'Your dealership has been invited to a private vehicle review workspace.',
      eyebrow: 'Private invitation',
      title: ['You’re invited.', 'Your workspace awaits.'],
      blocks: [
        { kind: 'text', text: 'Your dealership has been invited to Dealer Review: a private workspace where you submit vehicles and our team returns a considered assessment.' },
        {
          kind: 'details',
          rows: [
            ['Condition grade', 'Human-reviewed, from 1 to 5'],
            ['Listing price', 'A recommended price with perspective'],
            ['Branded report', 'A PDF to keep on file or share'],
          ],
        },
        { kind: 'text', text: 'Set your password to activate your account.' },
      ],
      cta: { label: 'Activate your account', url: LINK },
      note: `This link works once and expires in 24 hours. Expired? Get a new one at ${SITE}/activate`,
    },
  },
  {
    file: 'reset-password.html',
    menu: 'Reset password',
    subject: 'Your Dealer Review sign-in link',
    content: {
      preheader: 'Use this link to choose a new password for your Dealer Review account.',
      eyebrow: 'Account security',
      title: ['Choose a', 'new password.'],
      blocks: [{ kind: 'text', text: 'Use the button below to set a new password for your Dealer Review account. This link works once and expires in 24 hours.' }],
      cta: { label: 'Set my password', url: LINK },
      note: 'Didn’t ask for this? You can ignore this email; your password won’t change.',
    },
  },
  {
    file: 'confirm-signup.html',
    menu: 'Confirm signup',
    subject: 'Confirm your Dealer Review email',
    content: {
      preheader: 'Confirm your email address to finish setting up your account.',
      eyebrow: 'Confirm your email',
      title: ['One click.', 'You’re all set.'],
      blocks: [{ kind: 'text', text: 'Confirm that {{ .Email }} is your email address to finish setting up your Dealer Review account.' }],
      cta: { label: 'Confirm my email', url: LINK },
      note: 'Didn’t sign up? You can ignore this email.',
    },
  },
  {
    file: 'magic-link.html',
    menu: 'Magic link',
    subject: 'Your Dealer Review sign-in link',
    content: {
      preheader: 'Your one-time link to sign in to Dealer Review.',
      eyebrow: 'Sign in',
      title: ['Your sign-in', 'link is here.'],
      blocks: [{ kind: 'text', text: 'Use the button below to sign in to Dealer Review as {{ .Email }}. This link works once and expires shortly.' }],
      cta: { label: 'Sign me in', url: LINK },
      note: 'Didn’t ask to sign in? You can ignore this email; nobody can get in without this link.',
    },
  },
  {
    file: 'change-email.html',
    menu: 'Change email address',
    subject: 'Confirm your new Dealer Review email',
    content: {
      preheader: 'Confirm the change to your Dealer Review sign-in email.',
      eyebrow: 'Account security',
      title: ['Confirm your', 'new email.'],
      blocks: [
        { kind: 'text', text: 'Someone asked to change the email address you use to sign in to Dealer Review.' },
        {
          kind: 'details',
          rows: [
            ['From', '{{ .Email }}'],
            ['To', '{{ .NewEmail }}'],
          ],
        },
      ],
      cta: { label: 'Confirm the change', url: LINK },
      note: 'Didn’t ask for this? Don’t click the button, and reset your password to keep your account safe.',
    },
  },
  {
    file: 'reauthentication.html',
    menu: 'Reauthentication',
    subject: 'Your Dealer Review verification code',
    content: {
      preheader: 'Your one-time code to confirm it’s you.',
      eyebrow: 'Account security',
      title: ['Confirm', 'it’s you.'],
      blocks: [
        { kind: 'text', text: 'Enter this code in Dealer Review to confirm a sensitive change to your account.' },
        { kind: 'code', label: 'Your verification code', code: '{{ .Token }}' },
      ],
      note: 'This code expires shortly. Didn’t ask for it? Reset your password to keep your account safe.',
    },
  },
];

for (const t of templates) {
  const header = `<!-- Supabase → Authentication → Emails → "${t.menu}". Subject: ${t.subject} -->`;
  fs.writeFileSync(new URL(`../supabase/email-templates/${t.file}`, import.meta.url), `${header}\n${renderEmail(t.content, SITE)}\n`);
  console.log(`wrote supabase/email-templates/${t.file}`);
}
