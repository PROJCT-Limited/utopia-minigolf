"use client";

import { STATION_NUMBERS } from "@/lib/scoring/stations";
import styles from "./kiosk.module.css";

/**
 * The five stations as a strip: where the group is now, what they've logged,
 * what's left, and which one an antenna just saw a ball at (Feature 3's
 * "highlight the corresponding station").
 *
 * It's a map, not a progress bar, because the station order is non-strict —
 * a group can take 4, 1, 5, 3, 2 and the strip has to read correctly for
 * that. Position means station number, never sequence.
 */
export function StationStrip({
  current,
  outstanding,
  pulsing,
  onPick,
}: {
  current: number;
  /** Stations somebody in the group still hasn't logged. */
  outstanding: number[];
  /** Stations an antenna reported within the last couple of seconds. */
  pulsing: ReadonlySet<number>;
  onPick: (station: number) => void;
}) {
  return (
    <nav className={styles.strip} aria-label="Stations">
      {STATION_NUMBERS.map((n) => {
        const played = !outstanding.includes(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-current={n === current ? "step" : undefined}
            className={[
              styles.stripCell,
              n === current ? styles.stripCellCurrent : "",
              played ? styles.stripCellPlayed : "",
              pulsing.has(n) ? styles.stripCellPulse : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.stripNumber}>{n}</span>
            <span className={styles.stripState}>{played ? "logged" : n === current ? "here" : "to play"}</span>
          </button>
        );
      })}
    </nav>
  );
}
