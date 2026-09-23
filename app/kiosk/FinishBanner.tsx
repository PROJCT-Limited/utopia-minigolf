"use client";

import { cueCopy, type DetectionCue } from "@/lib/scoring/ballFeedback";
import styles from "./kiosk.module.css";

/**
 * Features 1 and 2 + the "end" half of Feature 5.
 *
 * The end gate saw the ball, so the kiosk asks the one question worth asking
 * — "Finished Station 3? Save your score." — and points at the button that
 * does it. At the group's last station the same component says the round is
 * over instead, and wears the deeper green rather than the orange, so
 * finishing a round never reads as just another station done.
 *
 * It prompts and nothing more. The player still types their own stroke count
 * and still presses save themselves; this component has no path to the
 * database. It also gets out of the way the moment anyone touches anything
 * (see clearBanner in KioskFlow) rather than making them wait out its timer.
 */
export function FinishBanner({
  cue,
  alreadyLogged,
  onAct,
  onDismiss,
}: {
  cue: DetectionCue;
  /** This player's score for this station is already in. */
  alreadyLogged: boolean;
  onAct: () => void;
  onDismiss: () => void;
}) {
  const copy = cueCopy(cue.kind, cue.stationNumber, cue.playerName, alreadyLogged);
  const isRound = cue.kind === "round-finish" && !alreadyLogged;

  return (
    <div
      className={`${styles.banner} ${isRound ? styles.bannerRound : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.bannerSweep} aria-hidden />
      <div className={styles.bannerText}>
        <span className={styles.bannerTitle}>{copy.title}</span>
        <span className={styles.bannerSub}>{copy.action}</span>
      </div>
      <button type="button" className={styles.bannerAct} onClick={onAct}>
        {cue.playerName ? `Log ${cue.playerName}` : "Log a score"} →
      </button>
      <button type="button" className={styles.bannerClose} onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
