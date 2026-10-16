import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

// Visible breadcrumb trail for inner pages (the matching BreadcrumbList JSON-LD comes from breadcrumbJsonLd).
export function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs eyebrow">
      <ol>
        <li>
          <Link href="/">{SITE_NAME}</Link>
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}

const PAGES = [
  { href: '/terms', label: 'Membership terms', note: 'How membership, billing and your account work.' },
  { href: '/terms#refunds', label: 'Cancellations and refunds', note: 'Cancelling, refund timing and charge questions.' },
  { href: '/privacy', label: 'Privacy policy', note: 'What we collect, why, and who processes it.' },
  { href: '/#enquire', label: 'Request an invitation', note: 'Tell us about your dealership.' },
  { href: '/#questions', label: 'FAQs', note: 'Quick answers about the service.' },
];

// Links between the public pages, shown at the foot of each inner page.
export function RelatedPages({ current }: { current: string }) {
  return (
    <nav aria-labelledby="related-title" className="related-pages">
      <h2 id="related-title">Related</h2>
      <ul>
        {PAGES.filter(p => !p.href.startsWith(`${current}#`) && p.href !== current).map(p => (
          <li key={p.href}>
            <Link href={p.href}>{p.label}</Link>
            <span>{p.note}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
