"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ui } from "@/content/ui";
import type { Locale, Publication } from "@/content/site";

const motionPreference = "(prefers-reduced-motion: reduce)";
const rotationInterval = 3000;

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(motionPreference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

type Slide = NonNullable<Publication["image"]>;

export default function ResearchCarousel({ slides, locale }: { slides: Slide[]; locale: Locale }) {
  const labels = ui[locale].carousel;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [imageFocused, setImageFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(motionPreference).matches,
    () => false,
  );
  const rotating = playing && !reducedMotion && slides.length > 1;

  function moveSlide(direction: -1 | 1) {
    setPlaying(false);
    setActive((index) => (index + direction + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!rotating || hovered || imageFocused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % slides.length);
    }, rotationInterval);
    return () => window.clearInterval(timer);
  }, [rotating, hovered, imageFocused, slides.length]);

  return <div className="research-carousel" role="group" aria-label={labels.label}>
    <div className="carousel-stage" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {slides.map(({ src, width, height, alt }, index) => (
        <a key={src} href={src} className="carousel-slide"
          data-active={index === active} inert={index !== active}
          aria-label={ui[locale].enlargeFigure + " · " + alt}
          onFocus={() => setImageFocused(true)} onBlur={() => setImageFocused(false)}>
          <Image src={src} alt={alt} width={width} height={height} unoptimized
            loading={index === 0 ? "eager" : "lazy"} />
        </a>
      ))}
      {slides.length > 1 && <>
        <button type="button" className="carousel-arrow carousel-arrow-prev"
          aria-label={labels.previous} onClick={() => moveSlide(-1)} />
        <button type="button" className="carousel-arrow carousel-arrow-next"
          aria-label={labels.next} onClick={() => moveSlide(1)} />
      </>}
    </div>
    {slides.length > 1 && <div className="carousel-controls">
      {slides.map(({ src }, index) => (
        <button type="button" className="carousel-dot" key={src} aria-label={labels.slide + " " + (index + 1)}
          aria-current={index === active ? "true" : undefined} onClick={() => {
            setPlaying(false);
            setActive(index);
          }} />
      ))}
      {!reducedMotion && <button type="button" className="carousel-toggle"
        aria-label={playing ? labels.pause : labels.play} onClick={() => setPlaying(!playing)}>
        <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      </button>}
    </div>}
  </div>;
}
