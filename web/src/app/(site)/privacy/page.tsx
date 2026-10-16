import type { Metadata } from 'next';
import Link from 'next/link';
import { PRIVACY_VERSION } from '@/lib/privacy';
import { CONTACT_EMAIL, breadcrumbJsonLd, pageMetadata } from '@/lib/site';
import { Breadcrumbs, RelatedPages } from '@/components/site/LegalNav';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy policy',
  description:
    'How D&D Auto Management collects, uses and protects information from dealerships and website visitors, and the services that process it.',
  path: '/privacy',
});

const updated = new Date(PRIVACY_VERSION).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Plain-language policy describing what the site and portal actually collect.
// D&D Auto Management should have it reviewed and update it if their practices change.
export default function PrivacyPage() {
  return (
    <main className="terms shell section-pad">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Privacy policy', path: '/privacy' }])) }} />
      <Breadcrumbs current="Privacy policy" />
      <h1>PRIVACY POLICY</h1>
      <p className="terms-meta">Last updated {updated}</p>

      <section>
        <h2>Who we are</h2>
        <p>
          D&D Auto Management runs an invitation-only vehicle review service for dealerships. This policy covers this website, the
          invitation request form and the private dealership workspace. Questions about it can go to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Invitation requests.</strong> Your name, dealership, work email and, if you choose, phone number, city and
            state, monthly vehicle volume and a message.
          </li>
          <li>
            <strong>Dealership accounts.</strong> The dealership name, the account holder’s name and email, a password (stored by
            our authentication provider, never readable by us), the date you accepted the membership terms, and your membership
            and billing status.
          </li>
          <li>
            <strong>Vehicle submissions.</strong> VINs, vehicle details, mileage, condition ratings and notes, asking prices,
            photos, messages with your reviewer, and the reviews and reports we produce.
          </li>
          <li>
            <strong>Payments.</strong> Card and bank details are entered on Stripe’s checkout and held by Stripe. We receive only
            the subscription status, plan and invoice records, not full card or account numbers.
          </li>
          <li>
            <strong>Technical data.</strong> Your IP address is used briefly to limit repeated sign-in and form attempts, and our
            hosting provider keeps standard request logs.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To respond to invitation requests and set up dealership workspaces.</li>
          <li>To review vehicles, return listing recommendations and produce reports.</li>
          <li>To send service emails: invitations, password resets, review updates, request receipts and billing notices.</li>
          <li>To take membership payments and manage billing.</li>
          <li>To keep accounts secure and prevent misuse.</li>
        </ul>
        <p>We don’t sell your information, and we don’t use it for advertising.</p>
      </section>

      <section>
        <h2>Cookies and storage</h2>
        <p>
          The public website doesn’t use advertising or analytics cookies. When you sign in to your workspace, your session is
          kept in your browser’s local storage so you stay signed in; signing out removes it. Stripe sets its own cookies on its
          checkout and billing pages.
        </p>
      </section>

      <section>
        <h2>Who processes it</h2>
        <p>We use a small number of service providers, who handle data only to run the service for us:</p>
        <ul>
          <li>Supabase: database, file storage for vehicle photos, and sign-in.</li>
          <li>Vercel: website and application hosting.</li>
          <li>Stripe: membership payments, invoices and the billing portal.</li>
          <li>Resend: delivery of service emails.</li>
          <li>NHTSA vPIC: VIN lookups. Only the VIN is sent, to fill in year, make and model.</li>
        </ul>
        <p>These providers may store data in the United States or other countries.</p>
      </section>

      <section>
        <h2>Who can see your vehicles</h2>
        <p>
          Your submissions, photos and reports are available only to your dealership and the D&D Auto Management review team.
          Other dealerships cannot browse or open them. Photos are served through private, expiring links.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Account, vehicle and report records are kept while your dealership is a member, and afterwards only as long as needed
          for records, billing and legal obligations. Invitation requests are kept until we no longer need them to follow up. You
          can ask us to delete your information at any time.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can ask to see, correct or delete the personal information we hold about you by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending on where you live, you may have further rights under
          local law; we’ll honour them. We won’t treat you differently for making a request.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data is encrypted in transit, access is checked on every request, and staff access is limited to the review team. No
          system is perfectly secure; if a breach affects your information, we’ll tell you as the law requires.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>This service is for businesses and isn’t directed at anyone under 18.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy, we’ll update the date above. Significant changes will be emailed to member dealerships. See
          also our <Link href="/terms">membership terms</Link>.
        </p>
      </section>

      <RelatedPages current="/privacy" />
    </main>
  );
}
