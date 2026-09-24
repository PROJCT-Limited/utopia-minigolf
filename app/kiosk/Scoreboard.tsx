"use client";

import { STATION_COUNT } from "@/lib/scoring/stations";
import type { StandingRow } from "@/lib/scoring/kioskScenes";
import styles from "./kiosk.module.css";

/**
 * The group's card, and the screen the kiosk rests on between balls.
 *
 * It's the only place the round's bookkeeping belongs: who's where, what's
 * left to play, and — when a ball has just been scored — whose number went
 * in. Everything that used to sit around the edges of this screen (the
 * antenna log, a permanent station strip) was the machine talking about
 * itself, which is of no use to five people deciding who's winning.
 *
 * Rows stay tappable when nothing is animating, because the stroke count is
 * typed by a person and must never depend on an antenna having fired.
 */
export function Scoreboard({
  rows,
  stationNumber,
  stationsRemaining,
  highlightPlayerId,
  interactive,
  onPick,
}: {
  rows: StandingRow[];
  stationNumber: number;
  stationsRemaining: number[];
  highlightPlayerId: string | null;
  interactive: boolean;
  onPick: (playerId: string) => void;
}) {
  return (
    <div className={styles.board}>
      <div className={styles.boardHead}>
        <span className={styles.boardCol}>Player</span>
        <span className={styles.boardColNum}>S{stationNumber}</span>
        <span className={styles.boardColNum}>Total</span>
      </div>

      {rows.map((row) => (
        <button
          key={row.playerId}
          type="button"
          className={`${styles.boardRow} ${row.playerId === highlightPlayerId ? styles.boardRowLit : ""}`}
          onClick={() => onPick(row.playerId)}
          disabled={!interactive}
        >
          <span className={styles.boardPlace}>{row.place ?? "–"}</span>
          <span className={styles.boardName}>{row.name}</span>
          <span className={styles.boardStation}>{row.atStation ?? "–"}</span>
          <span className={styles.boardTotal}>{row.stationsPlayed > 0 ? row.total : "–"}</span>
        </button>
      ))}

      <p className={styles.boardFoot}>
        Stations {STATION_COUNT - stationsRemaining.length} / {STATION_COUNT}
      </p>
    </div>
  );
}
