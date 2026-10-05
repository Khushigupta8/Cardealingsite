import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './console.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-orbitron' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'Dealer Review', template: '%s · Dealer Review' },
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export const viewport: Viewport = { themeColor: '#0d0d0d' };

// Root layout for the signed-in areas (admin, dealer workspace, account pages).
// The marketing site has its own root layout so the two stylesheets never mix.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
