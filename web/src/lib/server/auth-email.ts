import 'server-only';
import { HttpError } from './http';

const COPY_LINK = 'Use “Copy link” under People to share their link directly in the meantime.';

// Supabase sends invitation and reset emails itself. When it can't, say why in words an admin
// can act on, instead of a generic error. `null` means the error isn't about sending email.
export function emailFailure(error: { status?: number; code?: string; message: string }): HttpError | null {
  const code = error.code ?? '';
  const msg = error.message ?? '';
  if (error.status === 429 || code === 'over_email_send_rate_limit' || /rate limit/i.test(msg)) {
    return new HttpError(429, `Supabase’s email limit was reached, so no email was sent. ${COPY_LINK} To lift the limit, set up custom SMTP in Supabase → Authentication → Emails.`, 'email_rate_limited');
  }
  if (code === 'email_address_not_authorized' || /not authori[sz]ed/i.test(msg)) {
    return new HttpError(
      502,
      `No email was sent: Supabase’s built-in email only delivers to members of your Supabase team. ${COPY_LINK} To email anyone, set up custom SMTP in Supabase → Authentication → Emails.`,
      'email_not_authorized',
    );
  }
  if (code === 'email_address_invalid') return new HttpError(400, 'That email address can’t receive email. Check it and try again.', 'email_invalid');
  if (code === 'email_provider_disabled') return new HttpError(502, `Email sign-in is turned off in Supabase, so no email was sent. ${COPY_LINK}`, 'email_disabled');
  if (/send(ing)?\b.*\b(e-?mail|invite|recovery|magic)|smtp|mail server/i.test(msg) || error.status === 500) {
    return new HttpError(502, `Supabase couldn’t send the email (${msg || 'mail server error'}). Check the SMTP settings in Supabase → Authentication → Emails. ${COPY_LINK}`, 'email_failed');
  }
  return null;
}
