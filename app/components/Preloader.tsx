"use client";

import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

const ROLL_MS = 2800;
const FADE_MS = 450;

// Full-screen white overlay shown once on first load: the golf ball rolls in
// from off-screen, settles a moment, then rolls back out — then this
// unmounts and the page underneath is revealed. Client-side navigations
// (Link clicks) don't remount the root layout, so this never replays on
// internal navigation, only on an actual page load.
//
// No prefers-reduced-motion branch here on purpose: globals.css already
// disables every animation/transition site-wide for that preference, so the
// ball just sits still and the overlay disappears without motion — no need
// to duplicate that check (and matchMedia() can't run during SSR anyway,
// so branching on it here would mismatch the server-rendered markup).
export function Preloader() {
  const [stage, setStage] = useState<"rolling" | "fading" | "done">("rolling");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const fadeTimer = setTimeout(() => setStage("fading"), ROLL_MS);
    const doneTimer = setTimeout(() => {
      document.body.style.overflow = "";
      setStage("done");
    }, ROLL_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (stage === "done") return null;

  return (
    <div className={`${styles.overlay} ${stage === "fading" ? styles.fading : ""}`} role="status" aria-live="polite">
      <span className={styles.srOnly}>Loading FOUND…</span>
      <img src="/golf-ball.svg" alt="" aria-hidden="true" className={styles.ball} width={72} height={72} />
    </div>
  );
}
