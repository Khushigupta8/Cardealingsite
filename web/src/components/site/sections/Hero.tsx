// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import heroCar from '@/assets/images/hero-car-911.png';
import { HeroMotion } from '../HeroMotion';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <p className="eyebrow hero-kicker">Human-led vehicle assessments / For dealerships</p>
        <h1 id="hero-title">REVIEWED.</h1>
        <div className="hero-car">
          <Image
            src={heroCar}
            alt="Overhead view of a white Porsche 911 GT3 RS"
            sizes="(max-width: 860px) 100vw, 1020px"
            fetchPriority="high"
            loading="eager"
          />
        </div>
        <span className="hero-side left">Vehicle by vehicle.</span>
        <span className="hero-side right">Detail by detail.</span>
        <div className="hero-message">
          <h2>
            A clearer view.
            <br className="mobile-only" /> A confident listing.
          </h2>
          <p>
            Submit your vehicle details and photos. Our team returns a condition grade,
            <br className="desktop-only" /> recommended listing price and a branded report - inside your private portal.
          </p>
          <div className="hero-actions">
            <button className="button light" data-modal="signin">
              Enter your portal <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
            </button>
            <a href="#approach" className="text-arrow">
              Explore the service <i className="ph ph-arrow-down" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </div>
      <HeroMotion />
      <div className="hero-rail shell" aria-label="Your review includes">
        <div>
          <span className="rail-index">01</span>
          <i className="ph ph-car-profile" aria-hidden="true"></i>
          <p>
            Your vehicle
            <br />
            <strong>Your details</strong>
          </p>
        </div>
        <div>
          <span className="rail-index">02</span>
          <i className="ph ph-camera" aria-hidden="true"></i>
          <p>
            Photo uploads
            <br />
            <strong>From the lot</strong>
          </p>
        </div>
        <div className="rail-active">
          <span className="rail-index">03</span>
          <i className="ph ph-user-focus" aria-hidden="true"></i>
          <p>
            Human review
            <br />
            <strong>A closer look</strong>
          </p>
        </div>
        <div>
          <span className="rail-index">04</span>
          <i className="ph ph-gauge" aria-hidden="true"></i>
          <p>
            Condition & price
            <br />
            <strong>A clear assessment</strong>
          </p>
        </div>
        <div>
          <span className="rail-index">05</span>
          <i className="ph ph-file-text" aria-hidden="true"></i>
          <p>
            Your report
            <br />
            <strong>Ready to share</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
