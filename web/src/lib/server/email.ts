import 'server-only';
import { env } from './env';
import { admin } from './supabase';
import { renderEmail, renderText, type EmailContent } from './email-layout';

// Transactional email through Resend's HTTP API. Without RESEND_API_KEY it logs and skips,
// so everything works before the domain is verified.
// Note: Resend's test sender (onboarding@resend.dev) only delivers to the Resend account owner.

type Content = Omit<EmailContent, 'cta'> & { cta?: { label: string; path: string } };

export async function sendEmail({ to, subject, ...content }: { to: string[]; subject: string } & Content) {
  const recipients = [...new Set(to.filter(Boolean))];
  if (!recipients.length) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] skipped (no RESEND_API_KEY): "${subject}" -> ${recipients.length} recipient(s)`);
    return;
  }
  const site = env().APP_URL;
  const email: EmailContent = { ...content, cta: content.cta && { label: content.cta.label, url: `${site}${content.cta.path}` } };
  const html = renderEmail(email, site);
  const text = renderText(email);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Dealer Review <onboarding@resend.dev>', to: recipients, subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[email] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.error(`[email] failed: ${(err as Error).message}`);
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
