import type { Metadata, Viewport } from 'next';
import { preload } from 'react-dom';
import './site.css';

export const metadata: Metadata = {
  title: 'Dealer Review - Drive your next decision.',
  description:
    'An invitation-only vehicle review service for dealerships. Submit vehicle details and photos for a human-reviewed condition grade, listing recommendation and branded report.',
};

export const viewport: Viewport = { themeColor: '#151515' };

// Root layout for the public marketing site. The console has its own root layout,
// so the two stylesheets never mix.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // Headline and icon fonts are needed above the fold.
  for (const font of ['/fonts/orbitron-700.woff2', '/fonts/phosphor.woff2']) {
    preload(font, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
