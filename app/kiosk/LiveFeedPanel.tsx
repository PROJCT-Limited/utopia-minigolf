"use client";

import { STATION_COUNT } from "@/lib/scoring/stations";
import type { DetectionCue } from "@/lib/scoring/ballFeedback";
import { StationStrip } from "./StationStrip";
import styles from "./kiosk.module.css";

/**
 * The quiet half of the landscape layout: where the group is on the course,
 * what the antennas have just reported, and whether the feed is alive at all.
 *
 * Feature 3 lives here as well as on the tiles — any detection, start gate or
 * end gate, bound ball or stranger's, leaves a line in this list and pulses
 * its station in the strip. That's the lightweight confirmation that the
 * hardware is reading, with nothing to dismiss and nothing demanded of the
 * player.
 */
export function LiveFeedPanel({
  current,
  outstanding,
  pulsingStations,
  recent,
  unboundEpcs,
  feedDown,
  onPickStation,
}: {
  current: number;
  outstanding: number[];
  pulsingStations: ReadonlySet<number>;
  /** Newest first, already capped by the caller. */
  recent: DetectionCue[];
  unboundEpcs: string[];
  feedDown: boolean;
  onPickStation: (station: number) => void;
}) {
  return (
    <aside className={styles.feedPanel}>
      <span className={styles.feedLabel}>
        Course · {STATION_COUNT - outstanding.length} of {STATION_COUNT} logged
      </span>
      <StationStrip current={current} outstanding={outstanding} pulsing={pulsingStations} onPick={onPickStation} />

      <span className={styles.feedLabel}>Antenna feed</span>
      {feedDown ? (
        <p className={styles.feedDown}>
          No feed. The relay or the detections table isn&rsquo;t reachable — scores still save as normal.
        </p>
      ) : recent.length === 0 ? (
        <p className={styles.feedIdle}>Waiting for a ball.</p>
      ) : (
        <ul className={styles.feedList}>
          {recent.map((cue) => (
            <li key={cue.id} className={styles.feedItem}>
              <span className={styles.feedTime}>{cue.detectedAt.slice(11, 16)}</span>
              <span className={styles.feedWho}>{cue.playerName ?? `#${cue.epc.slice(-6)}`}</span>
              <span className={styles.feedWhat}>
                {cue.kind === "arrival" ? `start · S${cue.stationNumber}` : `end · S${cue.stationNumber}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {unboundEpcs.length > 0 && (
        <p className={styles.feedUnbound}>
          {unboundEpcs.length} {unboundEpcs.length === 1 ? "ball" : "balls"} here isn&rsquo;t linked to this group:{" "}
          {unboundEpcs.map((e) => `#${e.slice(-6)}`).join(", ")}
        </p>
      )}
    </aside>
  );
}
