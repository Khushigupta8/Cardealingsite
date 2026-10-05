// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import interiorDetail from '@/assets/images/interior-detail.jpg';
import dealerPhotographing from '@/assets/images/dealer-photographing.jpg';

export function IntroPanels() {
  return (
    <section className="intro-panels shell" id="approach" aria-label="A review service built around your dealership">
      <article className="feature-panel">
        <Image
          src={interiorDetail}
          alt="Close-up of leather, stitching and controls inside a vehicle"
          sizes="(max-width: 860px) 100vw, 50vw"
        />
        <div className="feature-copy">
          <p className="eyebrow">Built on attention to detail</p>
          <h2>
            Real vehicles.
            <br />
            Human judgment.
          </h2>
          <p>
            Your photos, notes and vehicle details are reviewed by our team. A considered assessment to support your listing
            decision.
          </p>
        </div>
      </article>
      <article className="feature-panel">
        <Image
          src={dealerPhotographing}
          alt="A dealership professional capturing vehicle photos on a phone"
          sizes="(max-width: 860px) 100vw, 50vw"
        />
        <div className="feature-copy">
          <p className="eyebrow">Made for your dealership</p>
          <h2>
            One private portal.
            <br />
            Your entire queue.
          </h2>
          <p>Submit from your phone. Track each review. Keep completed grades, recommendations and reports in one place.</p>
        </div>
      </article>
    </section>
  );
}
