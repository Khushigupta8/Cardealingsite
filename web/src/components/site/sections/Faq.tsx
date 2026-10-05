// Generated from the original static homepage; edit freely.
export function Faq() {
  return (
    <section className="faq section-pad shell" id="questions" aria-labelledby="faq-title">
      <div className="faq-intro">
        <p className="eyebrow">Before you begin</p>
        <h2 id="faq-title" data-reveal="">
          A FEW
          <br />
          <span>ANSWERS.</span>
        </h2>
        <button className="text-arrow" data-modal="support">
          Something else on your mind? <i className="ph ph-arrow-up-right" aria-hidden="true"></i>
        </button>
      </div>
      <div className="faq-list">
        <details open>
          <summary>
            Who is Dealer Review for?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              An invitation-only vehicle assessment service for dealerships. Submit your vehicle details and photos through a
              private portal. Our review team returns a condition grade, recommended listing price and notes.
            </p>
          </div>
        </details>
        <details>
          <summary>
            Is the listing price generated automatically?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              No. Your review is completed by our team using the information you submit. This service does not include automated
              pricing, live market data or auction feeds. The recommended price supports your listing decision.
            </p>
          </div>
        </details>
        <details>
          <summary>
            What do I need to submit a vehicle?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              Add the VIN, year, make, model, trim, mileage, condition notes and photos. An asking price is optional. VIN lookup
              can fill the year, make and model where a match is available. Check the details before submitting.
            </p>
          </div>
        </details>
        <details>
          <summary>
            Can I use it from my phone at the lot?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              Yes. Use the portal in your phone’s browser and upload photos directly from the camera. Images are compressed for
              easier uploading. No separate app is needed.
            </p>
          </div>
        </details>
        <details>
          <summary>
            How will I know my review is ready?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              Your vehicle moves to Completed and your dealership receives an email. Open the vehicle to see the assessment and
              download its branded report. If more detail is needed, the request appears under Needs info.
            </p>
          </div>
        </details>
        <details>
          <summary>
            Can another dealership see my vehicles?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              No. Each dealership has its own account and vehicle records. Your uploaded photos and details are available only to
              your dealership and the review team.
            </p>
          </div>
        </details>
        <details>
          <summary>
            How do membership and billing work?<i className="ph ph-plus" aria-hidden="true"></i>
          </summary>
          <div>
            <p>
              Follow your invitation, set a password and accept the membership terms. Subscribe through Stripe checkout using a
              card or ACH bank payment. Membership renews automatically. Use the billing portal to update payment details,
              download invoices or cancel. Failed payments receive a grace period before access pauses.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
