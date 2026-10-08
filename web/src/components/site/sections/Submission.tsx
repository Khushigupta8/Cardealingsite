// Generated from the original static homepage; edit freely.
import Image from 'next/image';
import mercedesG63 from '@/assets/images/mercedes-g63.jpg';

export function Submission() {
  return (
    <section className="submission section-pad shell" id="submit" aria-labelledby="submit-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / From your lot to a considered review</p>
          <h2 id="submit-title" data-reveal="">
            YOU SEND THE DETAILS.
            <br />
            <span>WE TAKE A CLOSER LOOK.</span>
          </h2>
        </div>
        <p className="section-description">
          A simple handoff. A useful result.
          <br />
          No separate app to install.
        </p>
      </div>
      <div className="submission-grid">
        <div className="submission-copy">
          <p className="body-copy">
            Add the VIN, mileage, your condition rating, notes and photos in your phone’s browser. VIN lookup fills the year, make and model
            where a match is available.
          </p>
          <div className="submission-specs">
            <div>
              <span>01</span>
              <p>
                <strong>The vehicle</strong>VIN, year, make, model, trim and mileage
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>The context</strong>Your 1-5 condition rating, notes and optional asking price
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>The detail</strong>Multiple photos, compressed for easier uploading
              </p>
            </div>
          </div>
          <p className="review-handoff">
            <i className="ph ph-arrow-elbow-down-right" aria-hidden="true"></i> It enters your queue as Pending. We email you when
            it’s complete.
          </p>
        </div>
        <div className="submission-console">
          <div className="console-top">
            <span className="eyebrow">Submission preview</span>
            <span className="status">Pending review</span>
          </div>
          <Image src={mercedesG63} alt="Black Mercedes-AMG G 63 ready for assessment" sizes="(max-width: 860px) 100vw, 45vw" />
          <div className="console-bottom">
            <div>
              <span className="eyebrow">Vehicle record / 001</span>
              <h3>2022 Mercedes-AMG G 63</h3>
              <p>
                18,240 mi <span>Photos attached</span>
              </p>
            </div>
            <i className="ph ph-arrow-down-right" aria-hidden="true"></i>
          </div>
          <div className="console-output">
            <p>What comes back</p>
            <span>Reviewer notes</span>
            <span>Listing recommendation</span>
            <span>Branded report</span>
          </div>
        </div>
      </div>
    </section>
  );
}
