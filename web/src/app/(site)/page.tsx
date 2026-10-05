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

export default function Home() {
  return (
    <SiteDialogs>
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
