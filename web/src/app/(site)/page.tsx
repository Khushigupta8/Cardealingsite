import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME, SITE_URL, absolute, pageMetadata } from '@/lib/site';
import { SiteDialogs } from '@/components/site/SiteDialogs';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ScrollMotion } from '@/components/site/ScrollMotion';
import { Hero } from '@/components/site/sections/Hero';
import { Cinema } from '@/components/site/sections/Cinema';
import { IntroPanels } from '@/components/site/sections/IntroPanels';
import { Submission } from '@/components/site/sections/Submission';
import { Report } from '@/components/site/sections/Report';
import { Portal } from '@/components/site/sections/Portal';
import { Conversation } from '@/components/site/sections/Conversation';
import { Editorial } from '@/components/site/sections/Editorial';
import { Privacy } from '@/components/site/sections/Privacy';
import { Membership } from '@/components/site/sections/Membership';
import { Enquire } from '@/components/site/sections/Enquire';
import { Faq } from '@/components/site/sections/Faq';
import { Closing } from '@/components/site/sections/Closing';
import { Footer } from '@/components/site/sections/Footer';

export const metadata: Metadata = pageMetadata({
  description:
    'An invitation-only vehicle review service for dealerships. Submit vehicle details, photos and your condition rating for a human-reviewed listing recommendation and branded report.',
  path: '/',
});

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: absolute('/'),
      logo: absolute('/email-logo.png'),
      email: CONTACT_EMAIL,
      description: 'Invitation-only, human-reviewed vehicle assessments and listing recommendations for dealerships.',
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: CONTACT_EMAIL, availableLanguage: 'English' },
    },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: absolute('/'), name: SITE_NAME, publisher: { '@id': `${SITE_URL}/#organization` } },
  ],
};

export default function Home() {
  return (
    <SiteDialogs>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Cinema />
        <IntroPanels />
        <Submission />
        <Report />
        <Portal />
        <Conversation />
        <Editorial />
        <Privacy />
        <Membership />
        <Enquire />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <ScrollMotion />
    </SiteDialogs>
  );
}
