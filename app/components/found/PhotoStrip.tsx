"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./PhotoStrip.module.css";

export type StripPhoto = { src: string; alt: string; width: number; height: number };

/**
 * A row of photos at one height that scrolls sideways: swipe on a phone,
 * arrows (or trackpad, or Shift+wheel) on a desktop. Each photo keeps its own
 * shape, so portraits and wide shots sit together like a contact sheet.
 * Nothing moves on its own.
 */
export function PhotoStrip({ label, photos }: { label: string; photos: StripPhoto[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      setAtStart(track.scrollLeft <= 2);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const step = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.7, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section className={styles.strip} aria-label={label}>
      <div className={styles.bar}>
        <span className={styles.label}>{label}</span>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => step(-1)} disabled={atStart} aria-label="Previous photos">
            ←
          </button>
          <button type="button" className={styles.arrow} onClick={() => step(1)} disabled={atEnd} aria-label="Next photos">
            →
          </button>
        </div>
      </div>
      <div ref={trackRef} className={styles.track} tabIndex={0}>
        {photos.map((p) => (
          <Image
            key={p.src}
            src={p.src}
            alt={p.alt}
            width={p.width}
            height={p.height}
            sizes="(max-width: 640px) 85vw, (max-width: 1200px) 60vw, 900px"
            className={styles.photo}
            style={{ aspectRatio: `${p.width} / ${p.height}` }}
          />
        ))}
      </div>
    </section>
  );
}
