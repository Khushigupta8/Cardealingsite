// Branded email layout, matching the website: black header with the logo, a red "hero" band
// with an eyebrow and a two-line uppercase headline, a dark content panel, a square red
// button and a quiet footer. Table-based with inline styles so it holds up in Gmail, Outlook
// and Apple Mail. Also used to generate the Supabase templates in supabase/email-templates
// (npm run email-templates), so keep this file free of imports.

export type EmailBlock =
  | { kind: 'text'; text: string }
  | { kind: 'quote'; text: string; from?: string }
  | { kind: 'stats'; items: { label: string; value: string; sub?: string }[] }
  | { kind: 'details'; rows: [label: string, value: string][] }
  | { kind: 'code'; label: string; code: string }; // a one-time code, shown large

export type EmailContent = {
  eyebrow: string; // small spaced label above the headline, e.g. "Review complete"
  title: [string, string?]; // headline: white line, then an optional soft-pink line
  blocks: EmailBlock[];
  cta?: { label: string; url: string };
  note?: string; // small print under the button
  preheader?: string; // inbox preview text
};

const C = {
  page: '#0b0b0b',
  card: '#151515',
  panel: '#202020',
  line: '#393939',
  ink: '#f5f5f2',
  body: '#c4c4c4',
  muted: '#8d8d8d',
  red: '#ef251c',
  darkRed: '#9e0c09',
  pink: '#ffccca',
};
const DISPLAY = "Orbitron,'Arial Black',Arial,Helvetica,sans-serif";
const SANS = 'Arial,Helvetica,sans-serif';
// Hosted in a public Supabase Storage bucket (email-assets) so mail clients can load it from
// anywhere, including emails sent from a local dev server. Copy of public/email-logo.png.
const LOGO_URL = 'https://caxwdfdhrhmvcxstqyik.supabase.co/storage/v1/object/public/email-assets/email-logo.png';

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function block(b: EmailBlock) {
  if (b.kind === 'code') {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr>
      <td align="center" style="background:${C.panel};border:1px solid ${C.line};border-top:3px solid ${C.red};padding:20px 18px">
        <p style="margin:0 0 10px;font:700 10px/1.4 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(b.label)}</p>
        <p style="margin:0;font:900 34px/1.1 ${DISPLAY};letter-spacing:8px;color:${C.ink}">${esc(b.code)}</p>
      </td></tr></table>`;
  }
  if (b.kind === 'text') return `<p style="margin:0 0 16px;font:15px/1.7 ${SANS};color:${C.body}">${esc(b.text)}</p>`;
  if (b.kind === 'quote') {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr>
      <td width="3" style="background:${C.red};font-size:0;line-height:0">&nbsp;</td>
      <td style="background:${C.panel};padding:16px 18px">
        ${b.from ? `<p style="margin:0 0 6px;font:700 10px/1.4 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(b.from)}</p>` : ''}
        <p style="margin:0;font:16px/1.6 ${SANS};color:${C.ink}">“${esc(b.text)}”</p>
      </td></tr></table>`;
  }
  if (b.kind === 'stats') {
    const w = Math.floor(100 / b.items.length);
    const cells = b.items
      .map(
        s => `<td width="${w}%" valign="top" style="background:${C.panel};border:1px solid ${C.line};border-top:3px solid ${C.red};padding:16px 18px">
          <p style="margin:0 0 8px;font:700 10px/1.4 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(s.label)}</p>
          <p style="margin:0;font:900 26px/1.1 ${DISPLAY};color:${C.ink}">${esc(s.value)}</p>
          ${s.sub ? `<p style="margin:6px 0 0;font:12px/1.4 ${SANS};color:${C.muted}">${esc(s.sub)}</p>` : ''}
        </td>`,
      )
      .join(`<td width="10" style="font-size:0">&nbsp;</td>`);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr>${cells}</tr></table>`;
  }
  const rows = b.rows
    .map(
      ([k, v], i) => `<tr>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ''}font:700 10px/1.4 ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted};width:38%">${esc(k)}</td>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ''}font:14px/1.5 ${SANS};color:${C.ink}">${esc(v)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line}">${rows}</table>`;
}

// `siteUrl` is where links point (APP_URL, or "{{ .SiteURL }}" in Supabase templates).
export function renderEmail(content: EmailContent, siteUrl: string) {
  const [line1, line2] = content.title;
  const button = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr>
        <td bgcolor="${C.red}" style="background:${C.red}">
          <a href="${esc(content.cta.url)}" style="display:inline-block;padding:16px 26px;font:700 12px/1 ${DISPLAY};letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;text-decoration:none">${esc(content.cta.label)}&nbsp;&nbsp;&#8599;</a>
        </td></tr></table>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(line1)}</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
<style>
  @media (max-width:620px){ .px{padding-left:22px!important;padding-right:22px!important} .h1{font-size:26px!important} }
  a{color:${C.red}}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page}">
${content.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(content.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page}">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card}">
      <tr><td class="px" bgcolor="#111111" style="background:#111111;padding:20px 36px;border-bottom:3px solid ${C.red}">
        <a href="${esc(siteUrl)}" style="text-decoration:none"><img src="${LOGO_URL}" width="150" height="55" alt="DEALER REVIEW." style="display:block;border:0;font:900 16px ${DISPLAY};color:#ffffff"></a>
      </td></tr>
      <tr><td class="px" bgcolor="${C.darkRed}" style="background:${C.darkRed};background-image:linear-gradient(135deg,${C.darkRed} 0%,#c8160f 55%,${C.red} 100%);padding:38px 36px 34px">
        <p style="margin:0 0 14px;font:700 11px/1.4 ${SANS};letter-spacing:3px;text-transform:uppercase;color:${C.pink}">${esc(content.eyebrow)}</p>
        <h1 class="h1" style="margin:0;font:900 30px/1.2 ${DISPLAY};text-transform:uppercase;letter-spacing:.5px;color:#ffffff">${esc(line1)}${line2 ? `<br><span style="color:${C.pink}">${esc(line2)}</span>` : ''}</h1>
      </td></tr>
      <tr><td class="px" style="padding:34px 36px 38px">
        ${content.blocks.map(block).join('\n        ')}
        ${button}
        ${content.note ? `<p style="margin:22px 0 0;font:13px/1.6 ${SANS};color:${C.muted}">${esc(content.note)}</p>` : ''}
      </td></tr>
      <tr><td class="px" style="padding:22px 36px 26px;border-top:1px solid ${C.line}">
        <p style="margin:0 0 6px;font:900 11px/1.4 ${DISPLAY};letter-spacing:2px;text-transform:uppercase;color:${C.ink}">Dealer Review<span style="color:${C.red}">.</span></p>
        <p style="margin:0;font:12px/1.6 ${SANS};color:${C.muted}">Considered vehicle reviews. For the business behind the listing.<br>Invite-only vehicle review service · <a href="${esc(siteUrl)}" style="color:${C.muted};text-decoration:underline">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Plain-text version for clients that don't show HTML.
export function renderText(content: EmailContent) {
  const out = [content.title.filter(Boolean).join(' '), ''];
  for (const b of content.blocks) {
    if (b.kind === 'text') out.push(b.text, '');
    if (b.kind === 'quote') out.push(`${b.from ? `${b.from}: ` : ''}“${b.text}”`, '');
    if (b.kind === 'stats') out.push(...b.items.map(s => `${s.label}: ${s.value}${s.sub ? ` (${s.sub})` : ''}`), '');
    if (b.kind === 'details') out.push(...b.rows.map(([k, v]) => `${k}: ${v}`), '');
    if (b.kind === 'code') out.push(`${b.label}: ${b.code}`, '');
  }
  if (content.cta) out.push(`${content.cta.label}: ${content.cta.url}`, '');
  if (content.note) out.push(content.note, '');
  out.push('Dealer Review · Invite-only vehicle review service');
  return out.join('\n');
}
