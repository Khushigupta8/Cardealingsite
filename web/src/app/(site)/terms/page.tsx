import type { Metadata } from 'next';
import Link from 'next/link';
import { TERMS_VERSION } from '@/lib/terms';

export const metadata: Metadata = {
  title: 'Membership terms · Dealer Review',
  description: 'A summary of the Dealer Review membership terms for dealerships.',
};

const updated = new Date(TERMS_VERSION).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Plain summary of how the membership works, as described across the site.
// The full legal agreement should be supplied by Dealer Review and placed here.
export default function TermsPage() {
  return (
    <main className="terms shell section-pad">
      <p className="eyebrow">
        <Link href="/">Dealer Review</Link> / Membership terms
      </p>
      <h1>MEMBERSHIP TERMS</h1>
      <p className="terms-meta">Summary · Last updated {updated}</p>

      <section>
        <h2>The service</h2>
        <p>
          Dealer Review is an invitation-only vehicle review service for dealerships. You submit vehicle details and photos through
          a private workspace, and our review team returns a condition grade, a recommended listing price and reviewer notes.
        </p>
        <p>
          Reviews are completed by people using the information and photos you provide. The recommended price supports your
          listing decision. It is not an appraisal, inspection or guarantee of value, and it does not use live market data or
          auction feeds.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          Each dealership has one login, created from a personal invitation. Keep your password private; you are responsible for
          activity on your dealership’s account. We may pause or close access to accounts that are misused.
        </p>
      </section>

      <section>
        <h2>Membership and billing</h2>
        <ul>
          <li>Your membership price and how often it is billed are agreed with your dealership and shown before you pay.</li>
          <li>Payments are taken by Stripe, by card or ACH bank payment where available.</li>
          <li>Membership renews automatically at the end of each billing period until you cancel.</li>
          <li>You can update payment details, download invoices or cancel at any time in the billing portal. Cancelling takes effect at the end of the period you have paid for.</li>
          <li>If a payment fails, you have a grace period to update your payment details. After it ends, submitting and updating vehicles pauses until payment is made. Your vehicles and completed reports stay available.</li>
        </ul>
      </section>

      <section>
        <h2>Your vehicles and data</h2>
        <p>
          Your submissions, photos and reports are private to your dealership and the Dealer Review team. Other dealerships cannot
          browse your submissions or open your vehicle records. You confirm you have the right to share the photos and details you
          submit.
        </p>
      </section>

      <p className="terms-note">
        This page summarises the membership. Questions about these terms? Ask your reviewer from any vehicle in your workspace.
      </p>
    </main>
  );
}
