// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import corvette from '@/assets/images/corvette-c8.jpg';

export function Closing() {
  return (
    <section className="closing shell" aria-labelledby="closing-title">
      <div className="closing-copy">
        <p className="eyebrow">Your next vehicle. A clearer perspective.</p>
        <h2 id="closing-title" data-reveal="">
          READY FOR
          <br />
          <span>A CLOSER LOOK?</span>
        </h2>
        <button className="button" data-modal="signin">
          Enter your dealership portal <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
        </button>
        <p>
          Private access. By invitation.{' '}
          <a className="inline-link" href="#enquire">
            Request yours
          </a>
        </p>
      </div>
      <div className="closing-image">
        <Image src={corvette} alt="Chevrolet Corvette C8 ready for a closer look" sizes="(max-width: 860px) 100vw, 50vw" />
        <span className="closing-image-label">
          YOUR NEXT MOVE.
          <br />
          BETTER INFORMED.
        </span>
      </div>
    </section>
  );
}
