import type { Metadata } from 'next';
import Link from 'next/link';
import { TERMS_VERSION } from '@/lib/terms';

export const metadata: Metadata = {
  title: 'Membership terms · D&D Auto Management',
  description: 'A summary of the D&D Auto Management membership terms for dealerships.',
};

const updated = new Date(TERMS_VERSION).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Plain summary of how the membership works, as described across the site.
// The full legal agreement should be supplied by D&D Auto Management and placed here.
export default function TermsPage() {
  return (
    <main className="terms shell section-pad">
      <p className="eyebrow">
        <Link href="/">D&D Auto Management</Link> / Membership terms
      </p>
      <h1>MEMBERSHIP TERMS</h1>
      <p className="terms-meta">Summary · Last updated {updated}</p>

      <section>
        <h2>The service</h2>
        <p>
          D&D Auto Management is an invitation-only vehicle review service for dealerships. You submit vehicle details, photos and your own
          condition rating through a private workspace, and our review team returns a recommended listing price and reviewer notes.
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
          Your submissions, photos and reports are private to your dealership and the D&D Auto Management team. Other dealerships cannot
          browse your submissions or open your vehicle records. You confirm you have the right to share the photos and details you
          submit.
        </p>
      </section>

      <section id="refunds">
        <h2>Cancellations and refunds</h2>
        <ul>
          <li>
            You can cancel at any time from the billing portal. Your membership stays active until the end of the period you have
            paid for, and you won’t be charged again.
          </li>
          <li>
            Membership fees cover access to the review service for the whole billing period. We don’t give refunds or credits for
            partly used periods, unused reviews or periods where no vehicles were submitted.
          </li>
          <li>
            Yearly memberships: if you cancel within 14 days of your first yearly payment and no reviews have been completed for
            your dealership, we’ll refund that payment in full. After that, yearly fees are non-refundable.
          </li>
          <li>
            If you were charged by mistake, such as a duplicate payment or a charge after you cancelled, we’ll refund the incorrect
            amount in full.
          </li>
          <li>
            Approved refunds go back to the card or bank account you paid with, usually within 5 to 10 business days depending on your
            bank.
          </li>
          <li>
            To ask about a refund or a charge, email us at{' '}
            <a href="mailto:devon@ddautomanagement.com">devon@ddautomanagement.com</a> with your dealership name and the invoice
            date. Please contact us before disputing a charge with your bank so we can resolve it quickly.
          </li>
        </ul>
      </section>

      <p className="terms-note">
        This page summarises the membership. Questions about these terms? Ask your reviewer from any vehicle in your workspace.
      </p>
    </main>
  );
}
