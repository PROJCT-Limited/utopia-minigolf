"use client";

import type { Scene } from "@/lib/scoring/kioskScenes";
import { Eyebrow } from "./Eyebrow";
import styles from "./kiosk.module.css";

/**
 * How big a name can be set before it stops fitting on one line.
 *
 * The arrival scene is usually one short first name, and it should be the
 * loudest thing the screen ever shows — but "Christopher" at the size that
 * suits "Jo" would wrap into two lines and lose the impact it was reaching
 * for. Three buckets, picked from the length, so a short name gets the full
 * treatment and a long one still lands on one line.
 */
function sizeBucket(headline: string): "short" | "medium" | "long" {
  if (headline.length <= 6) return "short";
  if (headline.length <= 11) return "medium";
  return "long";
}

/**
 * A scene, full bleed: one line to read, at the size you can read it from
 * across a station. The arrival and cheer beats both use this — same frame,
 * different accent — because to the player they're the same kind of moment:
 * the floor noticed something and is telling them about it.
 *
 * The bar along the bottom is the scene's own clock, so nobody is left
 * wondering whether the screen has frozen or is about to move on.
 */
export function SceneCard({ scene, onSkip }: { scene: Scene; onSkip: () => void }) {
  return (
    <button
      type="button"
      className={[
        styles.scene,
        scene.kind === "cheer" ? styles.sceneCheer : styles.sceneArrival,
        styles.sceneFull,
        scene.kind === "arrival" ? styles[`name${sizeBucket(scene.headline)}`] : "",
        scene.tone === "big" ? styles.sceneBig : "",
      ]
        .filter(Boolean)
        .join(" ")}
      // The bar's fill is driven by the scene's own hold time, so the two can
      // never drift apart the way a hardcoded animation duration would.
      style={{ "--scene-ms": `${scene.holdMs}ms` } as React.CSSProperties}
      onClick={onSkip}
      aria-live="polite"
    >
      <Eyebrow parts={scene.eyebrow} />
      <span className={styles.sceneHeadline}>{scene.headline}</span>
      <span className={styles.sceneSupport}>{scene.support}</span>
      <span className={styles.sceneClock} aria-hidden>
        <span className={styles.sceneClockFill} />
      </span>
      <span className={styles.sceneSkip}>
        {scene.then === "strokes" ? "Tap to count now" : "Tap to carry on"}
      </span>
    </button>
  );
}
