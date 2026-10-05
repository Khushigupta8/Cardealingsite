import 'server-only';
import { env } from './env';
import { admin } from './supabase';

// Transactional email through Resend's HTTP API. Without RESEND_API_KEY it logs and skips,
// so everything works before the domain is verified.
// Note: Resend's test sender (onboarding@resend.dev) only delivers to the Resend account owner.

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendEmail({ to, subject, heading, lines, cta }: { to: string[]; subject: string; heading: string; lines: string[]; cta?: { label: string; path: string } }) {
  const recipients = [...new Set(to.filter(Boolean))];
  if (!recipients.length) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] skipped (no RESEND_API_KEY): "${subject}" -> ${recipients.length} recipient(s)`);
    return;
  }
  const url = cta ? `${env().APP_URL}${cta.path}` : null;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#151515">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff">
    <tr><td style="background:#111;padding:14px 22px;color:#fff;font-weight:bold;letter-spacing:2px;font-size:14px"><img src="${env().APP_URL}/email-logo.png" width="150" height="55" alt="DEALER REVIEW." style="display:block;border:0;color:#fff"></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 14px;font-size:20px">${esc(heading)}</h1>
      ${lines.map(l => `<p style="margin:0 0 12px;line-height:1.55;font-size:15px;color:#333">${esc(l)}</p>`).join('')}
      ${url ? `<p style="margin:22px 0 0"><a href="${esc(url)}" style="background:#d6201b;color:#fff;text-decoration:none;padding:12px 20px;font-weight:bold;display:inline-block">${esc(cta!.label)}</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #eee;color:#888;font-size:12px">Dealer Review · Invite-only vehicle review service</td></tr>
  </table></td></tr></table></body></html>`;
  const text = [heading, '', ...lines, ...(url ? ['', `${cta!.label}: ${url}`] : [])].join('\n');

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
