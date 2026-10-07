// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import logo from '@/assets/images/logo.png';

export function Membership() {
  return (
    <section className="membership section-pad" id="membership" aria-labelledby="membership-title">
      <div className="shell membership-grid">
        <div className="membership-heading">
          <p className="eyebrow">05 / Membership</p>
          <h2 id="membership-title" data-reveal="">
            PART OF YOUR
            <br />
            <span>DAILY DRIVE.</span>
          </h2>
          <p className="body-copy">
            A recurring membership brings your submissions, assessments and reports into one private workspace. Access starts with
            an invitation to your dealership.
          </p>
          <button className="button" data-modal="activate">
            Activate your invitation <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
          </button>
          <p className="membership-access">
            Already a member?{' '}
            <button className="inline-link" data-modal="signin">
              Dealer login
            </button>
            {' · '}Not invited yet?{' '}
            <a className="inline-link" href="#enquire">
              Request an invitation
            </a>
          </p>
        </div>
        <div className="membership-ledger">
          <div className="ledger-top">
            <Image className="ledger-logo" src={logo} alt="Dealer Review" sizes="130px" />
            <span className="eyebrow">Membership / Included</span>
          </div>
          <div className="ledger-item">
            <span>Vehicle details & photo submissions</span>
            <i className="ph ph-check" aria-hidden="true"></i>
          </div>
          <div className="ledger-item">
            <span>A human review of every submission</span>
            <i className="ph ph-check" aria-hidden="true"></i>
          </div>
          <div className="ledger-item">
            <span>Listing recommendations & reviewer notes</span>
            <i className="ph ph-check" aria-hidden="true"></i>
          </div>
          <div className="ledger-item">
            <span>Downloadable branded valuation reports</span>
            <i className="ph ph-check" aria-hidden="true"></i>
          </div>
          <div className="ledger-item">
            <span>A private dealership workspace</span>
            <i className="ph ph-check" aria-hidden="true"></i>
          </div>
          <div className="billing-details">
            <div>
              <i className="ph ph-bank" aria-hidden="true"></i>
              <p>
                Card or ACH<span>Choose at checkout</span>
              </p>
            </div>
            <div>
              <i className="ph ph-receipt" aria-hidden="true"></i>
              <p>
                Billing portal<span>Invoices & payment details</span>
              </p>
            </div>
          </div>
          <p className="membership-note">
            Subscription details are provided with your invitation. Manage payments, download invoices or cancel through Stripe.
          </p>
        </div>
      </div>
    </section>
  );
}
