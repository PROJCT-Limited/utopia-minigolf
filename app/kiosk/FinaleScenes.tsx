"use client";

import { SCENE_MS, playerStats, type Scene, type StandingRow } from "@/lib/scoring/kioskScenes";
import { Eyebrow } from "./Eyebrow";
import styles from "./kiosk.module.css";

/**
 * The places, revealed from the back.
 *
 * Bottom-up because that's the only order with any suspense in it: the row
 * everyone is waiting for is the one that arrives last. The rows are in
 * finishing order in the markup — screen readers and a still photograph both
 * want that — and it's the animation delay that runs backwards.
 */
export function RevealScene({ scene, rows }: { scene: Scene; rows: StandingRow[] }) {
  return (
    <>
      <Eyebrow parts={scene.eyebrow} />
      <h1 className={styles.finaleHeadline}>{scene.headline}</h1>
      <div className={styles.revealList}>
        {rows.map((row, i) => (
          <div
            key={row.playerId}
            className={styles.revealRow}
            style={{ animationDelay: `${(rows.length - 1 - i) * SCENE_MS.revealPerRow}ms` }}
          >
            <span className={styles.revealPlace}>{row.place ?? "–"}</span>
            <span className={styles.revealName}>{row.name}</span>
            <span className={styles.revealTotal}>{row.stationsPlayed > 0 ? row.total : "–"}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * The winner, held long enough to be photographed.
 *
 * The four figures underneath are arithmetic on strokes the players typed
 * themselves: their total, the stations they took in one, the stations nobody
 * in the group beat them on, and their best single station. No timing, no
 * hazards, nothing the antennas would have to have measured.
 */
export function WinnerScene({
  scene,
  winners,
  roster,
  scoresByPlayer,
}: {
  scene: Scene;
  winners: StandingRow[];
  roster: { id: string; name: string }[];
  scoresByPlayer: Record<string, Record<number, number>>;
}) {
  const solo = winners.length === 1 ? winners[0] : null;
  const stats = solo ? playerStats(solo.playerId, solo.name, roster, scoresByPlayer) : null;

  return (
    <>
      <Eyebrow parts={scene.eyebrow} />
      <h1 className={styles.winnerHeadline}>{scene.headline}</h1>
      <p className={styles.winnerSupport}>{scene.support}</p>

      {stats && (
        <div className={styles.statRow}>
          <Stat label="Strokes" value={stats.total} />
          <Stat label="Holes in one" value={stats.aces} />
          <Stat label="Stations won" value={stats.stationsWon} />
          <Stat label="Best station" value={stats.best} />
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </span>
  );
}
