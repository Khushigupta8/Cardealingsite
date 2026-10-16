import type { Metadata, Viewport } from 'next';
import { preload } from 'react-dom';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './site.css';

// Defaults for every public page. Each page sets its own title, description, canonical and
// social tags through pageMetadata (src/lib/site.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} - Drive your next decision.`, template: `%s · ${SITE_NAME}` },
  description:
    'An invitation-only vehicle review service for dealerships. Submit vehicle details, photos and your condition rating for a human-reviewed listing recommendation and branded report.',
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#151515' };

// Root layout for the public marketing site. The console has its own root layout,
// so the two stylesheets never mix.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // Every Orbitron weight (headline 900, nav 700, labels 500) and the icon font are needed above
  // the fold; they're tiny, and preloading them avoids a flash of the fallback font.
  for (const font of ['/fonts/orbitron-900.woff2', '/fonts/orbitron-700.woff2', '/fonts/orbitron-500.woff2', '/fonts/phosphor.woff2']) {
    preload(font, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  return (
    <html lang="en">
      <body>
        {/* A tap on a dialog button before the page's script has loaded would do nothing (slow
            phones); remember it so SiteDialogs can open that dialog once it's ready. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-modal],[data-report],#sample-report');if(t&&!window.__siteDialogs)window.__earlyDialog=t},true)",
          }}
        />
        {children}
      </body>
    </html>
  );
}
