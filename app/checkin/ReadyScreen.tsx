"use client";

import { formatBallTag } from "@/lib/checkin/checkin";
import type { DisplayPlayer } from "./CheckInFlow";
import styles from "./checkin.module.css";

export function ReadyScreen({
  groupName,
  startTime,
  present,
  players,
  onStart,
  onBack,
  busy,
}: {
  groupName: string;
  startTime: string;
  present: number;
  players: DisplayPlayer[];
  onStart: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const countMismatch = players.length !== present;
  const missingBalls = players.filter((p) => !p.ballTagId);
  const unsynced = players.filter((p) => p.pending);

  return (
    <>
      <span className={styles.monoLabel}>{startTime} start</span>
      <h1 className={styles.heading}>{groupName} — ready to play</h1>

      <div className={styles.rosterList}>
        {players.map((player, i) => (
          <div key={player.id} className={styles.rosterRow}>
            <span className={styles.rosterIndex}>{i + 1}</span>
            <span className={styles.rosterName}>
              {player.name}
              {player.pending && <span className={styles.pendingChip}>waiting to sync</span>}
            </span>
            <span className={player.ballTagId ? styles.rosterBall : styles.rosterBallMissing}>
              {player.ballTagId ? formatBallTag(player.ballTagId) : "No ball"}
            </span>
          </div>
        ))}
      </div>

      {countMismatch && (
        <p className={styles.warn}>
          {players.length} registered, but {present} {present === 1 ? "player was" : "players were"} confirmed present. Go
          back and fix it, or carry on if the count changed at the door.
        </p>
      )}
      {missingBalls.length > 0 && (
        <p className={styles.warn}>
          {missingBalls.map((p) => p.name).join(", ")} {missingBalls.length === 1 ? "has" : "have"} no ball linked — their
          strokes won&rsquo;t be attributed until one is.
        </p>
      )}
      {unsynced.length > 0 && (
        <p className={styles.warn}>
          {unsynced.length} {unsynced.length === 1 ? "player is" : "players are"} still waiting for the connection to come
          back. They&rsquo;re saved on this tablet and will sync on their own.
        </p>
      )}

      <div className={styles.screenFooter}>
        <button type="button" className={styles.primaryBtn} onClick={onStart} disabled={busy || players.length === 0}>
          {busy ? "Finishing…" : "Start playing"}
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onBack}>
          Back to players
        </button>
      </div>
    </>
  );
}
