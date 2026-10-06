import 'server-only';
import { env } from './env';
import { admin } from './supabase';
import { renderEmail, renderText, type EmailContent } from './email-layout';

// Transactional email through Resend's HTTP API. Without RESEND_API_KEY it logs and skips.
//
// Test mode: Resend's test sender (onboarding@resend.dev) only delivers to the Resend account
// owner. Set EMAIL_TEST_INBOX to that address and every email goes there instead, with the
// intended recipients in the subject and at the top, so all flows can be tried before a
// domain is verified. Remove it once EMAIL_FROM uses a verified domain.

// The button goes to a page on the site (`path`) or to a full URL, such as a sign-in link.
type Content = Omit<EmailContent, 'cta'> & { cta?: { label: string } & ({ path: string } | { url: string }) };

export type SendResult = { ok: true } | { ok: false; reason: string };

export async function sendEmail({ to, subject, ...content }: { to: string[]; subject: string } & Content): Promise<SendResult> {
  const intended = [...new Set(to.filter(Boolean))];
  if (!intended.length) return { ok: false, reason: 'No recipients' };
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] skipped (no RESEND_API_KEY): "${subject}" -> ${intended.length} recipient(s)`);
    return { ok: false, reason: 'Email isn’t set up on the server (RESEND_API_KEY is missing).' };
  }
  const testInbox = process.env.EMAIL_TEST_INBOX?.trim();
  const recipients = testInbox ? [testInbox] : intended;
  if (testInbox) {
    subject = `[Test → ${intended.join(', ')}] ${subject}`;
    content.blocks = [{ kind: 'text', text: `Test mode: this email was meant for ${intended.join(', ')}.` }, ...content.blocks];
  }

  const site = env().APP_URL;
  const cta = content.cta && { label: content.cta.label, url: 'url' in content.cta ? content.cta.url : `${site}${content.cta.path}` };
  const email: EmailContent = { ...content, cta };
  const html = renderEmail(email, site);
  const text = renderText(email);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Dealer Review <onboarding@resend.dev>', to: recipients, subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error(`[email] Resend ${res.status}: ${body}`);
      const message = (() => { try { return JSON.parse(body).message as string; } catch { return body; } })();
      return { ok: false, reason: `The email provider refused it: ${message}` };
    }
    console.info(`[email] sent: "${subject}" -> ${recipients.join(', ')}`);
    return { ok: true };
  } catch (err) {
    console.error(`[email] failed: ${(err as Error).message}`);
    return { ok: false, reason: `Couldn’t reach the email provider: ${(err as Error).message}` };
  }
}

// Emails of active accounts matching a filter (e.g. the dealer of a dealership, or all admins).
export async function emailsFor(filter: { role?: 'dealer' | 'reviewer' | 'admin'; dealershipId?: string }) {
  let q = admin().from('profiles').select('*');
  if (filter.role) q = q.eq('role', filter.role);
  if (filter.dealershipId) q = q.eq('dealership_id', filter.dealershipId);
  const { data } = await q;
  const active = (data ?? []).filter(p => !p.disabled_at);
  const users = await Promise.all(active.map(p => admin().auth.admin.getUserById(p.id)));
  return users.map(u => u.data.user?.email ?? '').filter(Boolean);
}
