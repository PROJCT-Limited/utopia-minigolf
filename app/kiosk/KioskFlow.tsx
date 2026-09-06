"use client";

import { useEffect, useState } from "react";
import type { CurrentGroup, RosterPlayer } from "@/lib/scoring/scoringRepo";
import { stationLabel } from "@/lib/scoring/stations";
import {
  fetchCurrentGroupsAction,
  fetchRosterForGroupAction,
  createBookingRosterAction,
  fetchScoresForRosterAction,
  saveStationScoreAction,
} from "@/lib/scoring/scoringActions";
import styles from "./kiosk.module.css";

const POLL_INTERVAL_MS = 20_000;
const STATION_COUNT = 5;

type Step = "groups" | "roster" | "station" | "score";

export function KioskFlow({ initialGroups }: { initialGroups: CurrentGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [step, setStep] = useState<Step>("groups");
  const [selectedGroup, setSelectedGroup] = useState<CurrentGroup | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [rosterNames, setRosterNames] = useState<string[]>([]);
  const [currentStation, setCurrentStation] = useState(1);
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, Record<number, number>>>({});
  const [activePlayer, setActivePlayer] = useState<RosterPlayer | null>(null);
  const [pendingStrokes, setPendingStrokes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This iPad sits on a stand all day — keep the group list fresh while
  // idling on the picker screen, since who's "currently playing" changes
  // every few minutes as rounds start and finish.
  useEffect(() => {
    if (step !== "groups") return;
    const interval = setInterval(async () => {
      setGroups(await fetchCurrentGroupsAction());
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [step]);

  async function selectGroup(group: CurrentGroup) {
    setSelectedGroup(group);
    setError(null);
    const players = await fetchRosterForGroupAction(group.id);
    if (players.length === 0) {
      setRosterNames(Array(group.playerCount).fill(""));
      setStep("roster");
      return;
    }
    await enterStation(group, players, 1);
  }

  async function submitRoster() {
    if (!selectedGroup) return;
    setSubmitting(true);
    setError(null);
    const result = await createBookingRosterAction(selectedGroup.id, rosterNames);
    setSubmitting(false);
    if (!result.ok || !result.players) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    await enterStation(selectedGroup, result.players, 1);
  }

  async function enterStation(group: CurrentGroup, players: RosterPlayer[], station: number) {
    setRoster(players);
    setCurrentStation(station);
    setScoresByPlayer(await fetchScoresForRosterAction(players.map((p) => p.id)));
    setStep("station");
  }

  function selectPlayerForCurrentStation(player: RosterPlayer) {
    setActivePlayer(player);
    setPendingStrokes(scoresByPlayer[player.id]?.[currentStation] ?? 0);
    setError(null);
    setStep("score");
  }

  async function saveScore() {
    if (!selectedGroup || !activePlayer) return;
    const result = await saveStationScoreAction(activePlayer.id, currentStation, pendingStrokes);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save that score.");
      return;
    }
    setScoresByPlayer((s) => ({
      ...s,
      [activePlayer.id]: { ...s[activePlayer.id], [currentStation]: pendingStrokes },
    }));
    setError(null);
    setStep("station");
  }

  function goToStation(station: number) {
    setCurrentStation(station);
    setStep("station");
  }

  function backToGroups() {
    setStep("groups");
    setSelectedGroup(null);
    setActivePlayer(null);
    setRoster([]);
    setScoresByPlayer({});
    setCurrentStation(1);
    setError(null);
  }

  const doneCount = roster.filter((p) => scoresByPlayer[p.id]?.[currentStation] !== undefined).length;

  return (
    <div className={styles.panel}>
      <div className={styles.brand}>FOUND Scoring</div>

      {step !== "groups" && (
        <button type="button" className={styles.backLink} onClick={backToGroups}>
          ← Different group
        </button>
      )}

      {step === "groups" && (
        <>
          <h1 className={styles.heading}>Who&rsquo;s playing?</h1>
          {groups.length === 0 ? (
            <p className={styles.hint}>No groups are currently on the course. Check back closer to your start time.</p>
          ) : (
            <div className={styles.tileGrid}>
              {groups.map((g) => (
                <button key={g.id} type="button" className={styles.tile} onClick={() => selectGroup(g)}>
                  <div className={styles.tileTime}>{g.timeLabel}</div>
                  <div className={styles.tileName}>{g.displayName}</div>
                  <div className={styles.tileMeta}>{g.playerCount} players</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === "roster" && selectedGroup && (
        <>
          <h1 className={styles.heading}>Who&rsquo;s in {selectedGroup.displayName}?</h1>
          <p className={styles.hint}>Enter each player&rsquo;s name — you&rsquo;ll pick yours from this list at every station.</p>
          <div className={styles.nameList}>
            {rosterNames.map((name, i) => (
              <input
                key={i}
                type="text"
                className={styles.nameInput}
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) => setRosterNames((names) => names.map((n, idx) => (idx === i ? e.target.value : n)))}
              />
            ))}
          </div>
          <button type="button" className={styles.primaryBtn} onClick={submitRoster} disabled={submitting}>
            {submitting ? "Starting…" : "Start"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </>
      )}

      {step === "station" && selectedGroup && (
        <>
          <p className={styles.stationProgress}>Station {currentStation} of {STATION_COUNT}</p>
          <h1 className={styles.heading}>{stationLabel(currentStation)}</h1>
          <p className={styles.hint}>
            {doneCount} of {roster.length} logged — tap your name to register your strokes.
          </p>
          <div className={styles.tileGrid}>
            {roster.map((p) => {
              const done = scoresByPlayer[p.id]?.[currentStation] !== undefined;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.tile} ${done ? styles.tileDone : ""}`}
                  onClick={() => selectPlayerForCurrentStation(p)}
                >
                  <div className={styles.tileName}>{p.name}</div>
                  <div className={styles.tileMeta}>{done ? `${scoresByPlayer[p.id][currentStation]} strokes` : "Not logged yet"}</div>
                </button>
              );
            })}
          </div>
          <div className={styles.stationNav}>
            <button type="button" className={styles.navBtn} onClick={() => goToStation(currentStation - 1)} disabled={currentStation <= 1}>
              ← Previous station
            </button>
            {currentStation < STATION_COUNT ? (
              <button type="button" className={styles.primaryBtn} onClick={() => goToStation(currentStation + 1)}>
                Next station →
              </button>
            ) : (
              <button type="button" className={styles.primaryBtn} onClick={backToGroups}>
                Finish
              </button>
            )}
          </div>
        </>
      )}

      {step === "score" && selectedGroup && activePlayer && (
        <>
          <p className={styles.stationProgress}>
            {stationLabel(currentStation)} · {activePlayer.name}
          </p>
          <h1 className={styles.heading}>How many strokes?</h1>
          <div className={styles.bigStepper}>
            <button type="button" onClick={() => setPendingStrokes((n) => Math.max(1, n - 1))} disabled={pendingStrokes <= 1} aria-label="Fewer strokes">
              −
            </button>
            <span className={styles.bigStepperValue}>{pendingStrokes || "–"}</span>
            <button type="button" onClick={() => setPendingStrokes((n) => Math.min(20, n + 1))} aria-label="More strokes">
              +
            </button>
          </div>
          <button type="button" className={styles.primaryBtn} onClick={saveScore} disabled={pendingStrokes < 1}>
            Save
          </button>
          <button type="button" className={styles.backLink} style={{ marginTop: 16 }} onClick={() => setStep("station")}>
            ← Back without saving
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </>
      )}
    </div>
  );
}
