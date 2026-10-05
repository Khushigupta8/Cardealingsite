// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import forecourt from '@/assets/images/forecourt.jpg';

export function Editorial() {
  return (
    <section className="editorial-image" aria-labelledby="inventory-title">
      <Image src={forecourt} alt="Premium vehicles lined up on a dealership forecourt" sizes="100vw" />
      <div className="shell editorial-content">
        <p className="eyebrow">For the inventory you stand behind.</p>
        <h2 id="inventory-title" data-reveal="">
          EVERY LISTING
          <br />
          STARTS WITH
          <br />
          <span>A DECISION.</span>
        </h2>
        <p>A little more perspective before you make yours.</p>
      </div>
    </section>
  );
}
