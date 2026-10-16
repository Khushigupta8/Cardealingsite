import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/images/logo.png';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './(site)/site.css';

// 404 for any unmatched URL. The app has two root layouts (site and console), so this page
// renders its own <html> and imports the site stylesheet itself. Next adds noindex automatically.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Page not found · ${SITE_NAME}`,
  description: 'This page doesn’t exist. Head back to the D&D Auto Management homepage.',
};

export const viewport: Viewport = { themeColor: '#151515' };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="not-found shell">
          <Link className="brand-logo" href="/" aria-label={`${SITE_NAME} home`}>
            <Image src={logo} alt={SITE_NAME} sizes="170px" priority />
          </Link>
          <p className="eyebrow">Error 404</p>
          <p className="code" aria-hidden="true">404</p>
          <h1>THIS PAGE TOOK A WRONG TURN.</h1>
          <p>The page you’re looking for doesn’t exist or has moved. Everything else is right where you left it.</p>
          <div className="not-found-actions">
            <Link className="button" href="/">
              Back to the homepage
            </Link>
            <Link className="text-arrow" href="/#enquire">
              Request an invitation
            </Link>
          </div>
          <nav className="not-found-links" aria-label="Helpful links">
            <Link href="/#approach">The service</Link>
            <Link href="/#questions">FAQs</Link>
            <Link href="/terms">Membership terms</Link>
            <Link href="/privacy">Privacy policy</Link>
          </nav>
        </main>
      </body>
    </html>
  );
}
