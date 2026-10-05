// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import interiorDetail from '@/assets/images/interior-detail.jpg';
import graySuv from '@/assets/images/gray-suv.jpg';
import dealerPhotographing from '@/assets/images/dealer-photographing.jpg';

export function Report() {
  return (
    <section className="report-section section-pad" id="report" aria-labelledby="report-title">
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 / The completed review</p>
            <h2 id="report-title" data-reveal="">
              THE FULL PICTURE.
              <br />
              <span>IN ONE REPORT.</span>
            </h2>
          </div>
          <button className="button outline" id="sample-report">
            Open sample report <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
          </button>
        </div>
        <div className="report-grid">
          <article className="assessment-card">
            <div className="card-image">
              <Image src={interiorDetail} alt="Detailed view of a vehicle interior" sizes="(max-width: 860px) 100vw, 33vw" />
              <span className="card-index">01 / CONDITION</span>
            </div>
            <div className="card-body">
              <div className="grade-readout">
                <strong>
                  4<span>/5</span>
                </strong>
                <p>
                  Condition grade
                  <br />
                  <span>Illustrative scale</span>
                </p>
              </div>
              <h3>KNOW WHERE IT STANDS.</h3>
              <p>A clear grade based on the vehicle information and photos you submit.</p>
              <button className="card-link" data-report="">
                Explore the assessment <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
              </button>
            </div>
          </article>
          <article className="assessment-card">
            <div className="card-image">
              <Image src={graySuv} alt="Gray Porsche Macan used in the sample report" sizes="(max-width: 860px) 100vw, 33vw" />
              <span className="card-index">02 / RECOMMENDATION</span>
            </div>
            <div className="card-body">
              <div className="price-readout">
                <strong>$39,500</strong>
                <p>Sample recommended listing</p>
              </div>
              <h3>A PRICE WITH PERSPECTIVE.</h3>
              <p>A human-reviewed listing recommendation to support your next decision.</p>
              <button className="card-link" data-report="">
                See the recommendation <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
              </button>
            </div>
          </article>
          <article className="assessment-card">
            <div className="card-image">
              <Image
                src={dealerPhotographing}
                alt="Dealer documenting a vehicle for its review"
                sizes="(max-width: 860px) 100vw, 33vw"
              />
              <span className="card-index">03 / CONTEXT</span>
            </div>
            <div className="card-body">
              <div className="notes-readout">
                <i className="ph ph-quotes" aria-hidden="true"></i>
                <p>“Well presented. Minor interior wear consistent with mileage.”</p>
              </div>
              <h3>THE REASONING, RECORDED.</h3>
              <p>Reviewer notes and the date graded stay with your vehicle’s completed report.</p>
              <button className="card-link" data-report="">
                Read the sample notes <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
              </button>
            </div>
          </article>
        </div>
        <div className="report-strip">
          <p>
            <i className="ph ph-download-simple" aria-hidden="true"></i> Download a branded report. Keep it on file. Share with a
            buyer or manager.
          </p>
          <span>Sample vehicle, pricing and scale shown.</span>
        </div>
      </div>
    </section>
  );
}
