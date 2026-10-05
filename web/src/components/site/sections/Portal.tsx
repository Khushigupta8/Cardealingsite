// Generated from the original static homepage; edit freely.
import { PortalDemo } from '../PortalDemo';

export function Portal() {
  return (
    <section className="portal section-pad shell" id="portal" aria-labelledby="portal-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / Your dealership workspace</p>
          <h2 id="portal-title" data-reveal="">
            EVERY VEHICLE.
            <br />
            <span>ONE CLEAR VIEW.</span>
          </h2>
        </div>
        <span className="quiet-label">
          <i className="ph ph-lock-simple" aria-hidden="true"></i> Private dealership access
        </span>
      </div>
      <div className="portal-grid">
        <div className="portal-copy">
          <p className="body-copy">
            Know what’s waiting, what needs your attention and what’s ready to download. Search your own inventory and pick up
            exactly where you left off.
          </p>
          <div className="status-explainer">
            <div>
              <span className="status-dot pending"></span>
              <p>
                <strong>Pending</strong>Submitted and waiting for review.
              </p>
            </div>
            <div>
              <span className="status-dot info"></span>
              <p>
                <strong>Needs info</strong>A request for more detail from your reviewer.
              </p>
            </div>
            <div>
              <span className="status-dot complete"></span>
              <p>
                <strong>Completed</strong>Your assessment and report are ready.
              </p>
            </div>
          </div>
          <p className="interaction-hint">
            <i className="ph ph-cursor-click" aria-hidden="true"></i> Try the tabs and search in this sample.
          </p>
        </div>
        <PortalDemo />
      </div>
    </section>
  );
}
