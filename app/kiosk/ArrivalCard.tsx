"use client";

import { arrivalCopy, type DetectionCue } from "@/lib/scoring/ballFeedback";
import styles from "./kiosk.module.css";

/**
 * Feature 4 + the "beginning" half of Feature 5.
 *
 * A ball crosses a station's start gate, and the first thing the kiosk does
 * is say who just arrived — group first, then the player — before anyone is
 * asked for a number. It holds the screen for about two seconds (the group
 * name is the point of it; nobody should have to read fast), then releases
 * stroke entry on its own. A tap skips it.
 *
 * It's a sequencing beat, not a lock: strokes remain manual and
 * authoritative, so a player who ignores this and types is never blocked.
 *
 * Paired gesture: this sweeps in from the left in acid yellow; the finish
 * banner sweeps from the right in safety orange. Same motion, opposite
 * direction — the two ends of one movement across the station.
 */
export function ArrivalCard({
  cue,
  groupName,
  onDismiss,
}: {
  cue: DetectionCue;
  groupName: string;
  onDismiss: () => void;
}) {
  return (
    <button type="button" className={styles.arrivalCard} onClick={onDismiss}>
      <span className={styles.arrivalSweep} aria-hidden />
      <span className={styles.arrivalLabel}>Ball detected</span>
      <span className={styles.arrivalGroup}>{groupName}</span>
      <span className={styles.arrivalPlayer}>{arrivalCopy(cue.stationNumber, cue.playerName)}</span>
      <span className={styles.arrivalHint}>
        {cue.playerName ? "Tap to start logging strokes" : "This ball isn't linked to anyone in this group"}
      </span>
    </button>
  );
}
