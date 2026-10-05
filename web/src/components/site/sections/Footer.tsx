// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import logo from '@/assets/images/logo.png';

export function Footer() {
  return (
    <footer className="site-footer shell">
      <div className="footer-top">
        <div>
          <a className="brand-logo footer-logo" href="#" aria-label="Dealer Review home">
            <Image src={logo} alt="Dealer Review" sizes="190px" />
          </a>
          <p>
            Considered vehicle reviews.
            <br />
            For the business behind the listing.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <div>
            <span className="eyebrow">Explore</span>
            <a href="#approach">The service</a>
            <a href="#report">Your report</a>
            <a href="#membership">Membership</a>
          </div>
          <div>
            <span className="eyebrow">Your dealership</span>
            <button className="text-button" data-modal="signin">
              Dealer login
            </button>
            <button className="text-button" data-modal="activate">
              Activate invitation
            </button>
            <button className="text-button" data-modal="support">
              Account support
            </button>
            <a href="#enquire">Request an invitation</a>
            <a href="/terms">Membership terms</a>
          </div>
          <div>
            <span className="eyebrow">Your questions</span>
            <a href="#questions">FAQs</a>
            <a href="#privacy">Your private workspace</a>
            <a href="#submit">Vehicle submissions</a>
          </div>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Dealer Review</span>
        <span>Invite-only vehicle review service</span>
        <a className="back-top" href="#">
          Back to top <i className="ph ph-arrow-up" aria-hidden="true"></i>
        </a>
      </div>
    </footer>
  );
}
