'use client';

import { useEffect, useRef, useState } from 'react';

// Cinematic film: fills the frame, plays muted on loop while on screen, pauses when scrolled away.
// With "reduce motion" on it doesn't autoplay and shows controls instead.
export function CinemaFilm({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [controls, setControls] = useState(false);

  useEffect(() => {
    const film = ref.current;
    if (!film) return;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setControls(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) film.play().catch(() => {});
        else film.pause();
      },
      { threshold: 0.35 },
    );
    observer.observe(film);
    return () => observer.disconnect();
  }, []);

  return (
    <video id="car-film" ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" controls={controls} aria-label="Cinematic car film" />
  );
}
