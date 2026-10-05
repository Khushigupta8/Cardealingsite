// Generated from the original static homepage; edit freely.
import { CinemaFilm } from '../CinemaFilm';

export function Cinema() {
  return (
    <section className="cinema shell" aria-labelledby="cinema-title">
      <div className="cinema-heading">
        <div>
          <p className="eyebrow">THE AUTOMOTIVE EDIT</p>
          <h2 id="cinema-title">
            EVERY ANGLE.
            <br />
            <span>WORTH A CLOSER LOOK.</span>
          </h2>
        </div>
        <p>
          Form. Finish. The finer details.
          <br />A moment for the machines behind the business.
        </p>
      </div>
      <div className="cinema-screen has-video">
        <CinemaFilm src="/videos/car-film.mp4" poster="/images/film-poster.jpg" />
        <span className="cinema-corner">01 / THE STUDIO EDIT</span>
      </div>
      <div className="cinema-footer">
        <span>Crimson / Chrome / Carbon</span>
        <span>The automotive motion series - 01</span>
      </div>
    </section>
  );
}
