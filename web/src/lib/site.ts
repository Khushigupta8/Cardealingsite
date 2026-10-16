import type { Metadata } from 'next';

// Public site identity, shared by metadata, robots.txt, the sitemap and JSON-LD.
// SITE_URL overrides the canonical origin (e.g. a staging domain); it never needs secrets, so it's safe at build time.
export const SITE_URL = (process.env.SITE_URL || 'https://www.ddautomanagement.com').replace(/\/$/, '');
export const SITE_NAME = 'D&D Auto Management';
export const CONTACT_EMAIL = 'devon@ddautomanagement.com';

// Social share card (1200×630) used by every public page.
const SHARE_IMAGE = {
  url: '/images/og-card.jpg',
  width: 1200,
  height: 630,
  alt: 'D&D Auto Management: human-reviewed vehicle assessments for dealerships, shown over a white Porsche 911 GT3 RS',
};

export const absolute = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

// BreadcrumbList JSON-LD for an inner page, starting at the homepage.
export const breadcrumbJsonLd = (crumbs: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ name: SITE_NAME, path: '/' }, ...crumbs].map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: absolute(c.path),
  })),
});

// Title, description, canonical and social tags for one public page. Next replaces (doesn't merge) a
// page's openGraph object with the layout's, so the shared fields are repeated here.
export function pageMetadata({ title, description, path }: { title?: string; description: string; path: string }): Metadata {
  const social = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} - Drive your next decision.`;
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', url: path, title: social, description, images: [SHARE_IMAGE] },
    twitter: { card: 'summary_large_image', title: social, description, images: [SHARE_IMAGE] },
  };
}
