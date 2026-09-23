"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { BallDetection, CurrentGroup, RosterPlayer } from "@/lib/scoring/scoringRepo";
import { stationLabel, STATION_COUNT } from "@/lib/scoring/stations";
import {
  ARRIVAL_HOLD_MS,
  BANNER_DISMISS_MS,
  CUE_GLOW_MS,
  stationsOutstanding,
  type DetectionCue,
} from "@/lib/scoring/ballFeedback";
import {
  fetchCurrentGroupsAction,
  fetchRosterForGroupAction,
  createBookingRosterAction,
  fetchScoresForRosterAction,
  saveStationScoreAction,
} from "@/lib/scoring/scoringActions";
import { useDetectionFeed } from "./useDetectionFeed";
import { ArrivalCard } from "./ArrivalCard";
import { FinishBanner } from "./FinishBanner";
import { LiveFeedPanel } from "./LiveFeedPanel";
import { DEMO_GROUP_ID, DEMO_ROSTER, demoDetection, demoScores } from "./demoFeed";
import {
  mutedServerSnapshot,
  mutedSnapshot,
  playCueSound,
  setMuted,
  subscribeMuted,
  unlockCueSounds,
} from "./cueSounds";
import styles from "./kiosk.module.css";

const POLL_INTERVAL_MS = 20_000;
/** How many antenna reports the live panel keeps on screen. */
const FEED_HISTORY = 5;

/** Render an ISO timestamp as "HH:MM" in the venue's local clock. Supabase
 *  stores timestamptz in UTC; kiosk display is Hong Kong wall-clock.
 *  Cheap string slice: "YYYY-MM-DDTHH:MM:SS.sssZ" → pick HH:MM directly,
 *  which is wrong in absolute terms but matches the existing kiosk style
 *  (see other HH:MM usages). */
function fmtHm(iso: string): string {
  return iso.slice(11, 16);
}

type Step = "groups" | "roster" | "station" | "score";

const DEMO_GROUP: CurrentGroup = {
  id: DEMO_GROUP_ID,
  timeLabel: "demo",
  ticketType: "standard",
  displayName: "Demo group",
  playerCount: DEMO_ROSTER.length,
  windowStartIso: new Date(0).toISOString(),
  windowEndIso: new Date(0).toISOString(),
};

export function KioskFlow({ initialGroups, demo = false }: { initialGroups: CurrentGroup[]; demo?: boolean }) {
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

  // ---- RFID visual feedback -------------------------------------------------
  const [arrivalCue, setArrivalCue] = useState<DetectionCue | null>(null);
  const [bannerCue, setBannerCue] = useState<DetectionCue | null>(null);
  // Who the last finish cue was about. The banner itself clears the moment
  // anyone touches anything, but the highlight it hands off — the player's
  // tile, then the Save button on their score screen — has to outlive it, or
  // following the prompt makes the prompt's own pointer disappear.
  const [cuedPlayerId, setCuedPlayerId] = useState<string | null>(null);
  const [pulses, setPulses] = useState<DetectionCue[]>([]);
  const [recent, setRecent] = useState<DetectionCue[]>([]);
  const muted = useSyncExternalStore(subscribeMuted, mutedSnapshot, mutedServerSnapshot);

  const isDemo = selectedGroup?.id === DEMO_GROUP_ID;
  const watching = step === "station" || step === "score";

  const handleCues = useCallback((cues: DetectionCue[]) => {
    setRecent((current) => [...cues].reverse().concat(current).slice(0, FEED_HISTORY));
    setPulses((current) => [...current, ...cues]);
    for (const cue of cues) {
      window.setTimeout(() => setPulses((current) => current.filter((p) => p.id !== cue.id)), CUE_GLOW_MS);
    }

    // If a start-gate and an end-gate read land in the same poll, the end
    // gate is what needs saying — the brief's priority rule. The arrival
    // still pulses and still lands in the feed list; it just doesn't take
    // the screen while a "save your score" prompt is up.
    const finish = [...cues].reverse().find((c) => c.kind !== "arrival");
    const arrival = [...cues].reverse().find((c) => c.kind === "arrival");

    if (finish) {
      setArrivalCue(null);
      setBannerCue(finish);
      setCuedPlayerId(finish.playerId);
      playCueSound(finish.kind);
      return;
    }
    if (arrival) {
      setArrivalCue((current) => current ?? arrival);
      playCueSound("arrival");
    }
  }, []);

  const feed = useDetectionFeed({
    group: selectedGroup,
    roster,
    station: currentStation,
    scoresByPlayer,
    enabled: watching && !isDemo,
    live: !isDemo,
    onCues: handleCues,
  });

  // Both cues clear themselves: the arrival card is an orientation beat, and
  // a banner nobody answers must not sit on the screen in front of the next
  // group. Keyed on the cue's id so a fresh detection restarts the clock
  // rather than inheriting the old one's remaining time.
  const arrivalId = arrivalCue?.id ?? null;
  useEffect(() => {
    if (!arrivalId) return;
    const timer = window.setTimeout(() => setArrivalCue(null), ARRIVAL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [arrivalId]);

  const bannerId = bannerCue?.id ?? null;
  useEffect(() => {
    if (!bannerId) return;
    const timer = window.setTimeout(() => setBannerCue(null), BANNER_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [bannerId]);

  /** Any deliberate touch means the prompt has done its job. */
  const clearCues = useCallback(() => {
    setArrivalCue(null);
    setBannerCue(null);
  }, []);

  const pulsingStations = useMemo(() => new Set(pulses.map((p) => p.stationNumber)), [pulses]);
  const pulsingEpcs = useMemo(() => new Set(pulses.map((p) => p.epc)), [pulses]);
  const outstanding = useMemo(() => stationsOutstanding(scoresByPlayer, roster), [scoresByPlayer, roster]);

  // ---- group / roster / station flow ---------------------------------------

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
    // First tap of the session: audio can only be unlocked from a gesture,
    // and every cue after this is fired by an antenna, which isn't one.
    unlockCueSounds();
    setSelectedGroup(group);
    setError(null);

    if (group.id === DEMO_GROUP_ID) {
      setRoster(DEMO_ROSTER);
      setScoresByPlayer(demoScores());
      setCurrentStation(1);
      setStep("station");
      return;
    }

    const players = await fetchRosterForGroupAction(group.id);
    if (players.length === 0) {
      setRosterNames(Array(group.playerCount).fill(""));
      setStep("roster");
      return;
    }
    await enterStation(players, 1);
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
    await enterStation(result.players, 1);
  }

  async function enterStation(players: RosterPlayer[], station: number) {
    setRoster(players);
    setCurrentStation(station);
    setScoresByPlayer(await fetchScoresForRosterAction(players.map((p) => p.id)));
    setStep("station");
  }

  function selectPlayerForCurrentStation(player: RosterPlayer) {
    clearCues();
    setActivePlayer(player);
    setPendingStrokes(scoresByPlayer[player.id]?.[currentStation] ?? 0);
    setError(null);
    setStep("score");
  }

  async function saveScore() {
    if (!selectedGroup || !activePlayer) return;
    clearCues();

    if (!isDemo) {
      const result = await saveStationScoreAction(activePlayer.id, currentStation, pendingStrokes);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save that score.");
        return;
      }
    }

    setScoresByPlayer((s) => ({
      ...s,
      [activePlayer.id]: { ...s[activePlayer.id], [currentStation]: pendingStrokes },
    }));
    if (cuedPlayerId === activePlayer.id) setCuedPlayerId(null);
    setError(null);
    setStep("station");
  }

  function goToStation(station: number) {
    clearCues();
    setCuedPlayerId(null);
    setCurrentStation(station);
    setStep("station");
  }

  function backToGroups() {
    clearCues();
    setStep("groups");
    setSelectedGroup(null);
    setActivePlayer(null);
    setRoster([]);
    setScoresByPlayer({});
    setCuedPlayerId(null);
    setPulses([]);
    setRecent([]);
    setCurrentStation(1);
    setError(null);
  }

  const doneCount = roster.filter((p) => scoresByPlayer[p.id]?.[currentStation] !== undefined).length;
  const pickableGroups = demo ? [DEMO_GROUP, ...groups] : groups;

  function injectDemo(role: "start" | "end", player?: RosterPlayer) {
    unlockCueSounds();
    const row: BallDetection = demoDetection({
      role,
      station: currentStation,
      player: player ? { id: player.id, name: player.name, ballTagId: player.ballTagId } : undefined,
    });
    feed.injectDetections([row]);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.topBar}>
        <span className={styles.brand}>
          FOUND Scoring
          {isDemo && <span className={styles.demoChip}>demo — nothing is saved</span>}
        </span>
        <button
          type="button"
          className={styles.muteBtn}
          onClick={() => {
            unlockCueSounds();
            setMuted(!muted);
          }}
          aria-pressed={muted}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>

      {step !== "groups" && (
        <button type="button" className={styles.backLink} onClick={backToGroups}>
          ← Different group
        </button>
      )}

      {step === "groups" && (
        <>
          <h1 className={styles.heading}>Who&rsquo;s playing?</h1>
          {pickableGroups.length === 0 ? (
            <p className={styles.hint}>No groups are currently on the course. Check back closer to your start time.</p>
          ) : (
            <div className={styles.tileGrid}>
              {pickableGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`${styles.tile} ${g.id === DEMO_GROUP_ID ? styles.tileDemo : ""}`}
                  onClick={() => selectGroup(g)}
                >
                  <div className={styles.tileTime}>{g.timeLabel}</div>
                  <div className={styles.tileName}>{g.displayName}</div>
                  <div className={styles.tileMeta}>
                    {g.playerCount} {g.playerCount === 1 ? "player" : "players"}
                  </div>
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
        <div className={styles.stationLayout}>
          <section className={styles.stationMain}>
            <p className={styles.stationProgress}>
              Station {currentStation} of {STATION_COUNT}
            </p>
            <h1 className={styles.heading}>{stationLabel(currentStation)}</h1>
            <p className={styles.hint}>
              {doneCount} of {roster.length} logged — tap your name to register your strokes.
            </p>

            {bannerCue && (
              <FinishBanner
                cue={bannerCue}
                alreadyLogged={
                  bannerCue.playerId !== null &&
                  scoresByPlayer[bannerCue.playerId]?.[currentStation] !== undefined
                }
                onAct={() => {
                  const player = roster.find((p) => p.id === bannerCue.playerId);
                  if (player) selectPlayerForCurrentStation(player);
                  else clearCues();
                }}
                onDismiss={clearCues}
              />
            )}

            {arrivalCue && (
              <ArrivalCard cue={arrivalCue} groupName={selectedGroup.displayName} onDismiss={clearCues} />
            )}

            <div className={`${styles.tileGrid} ${arrivalCue ? styles.tileGridHeld : ""}`}>
              {roster.map((p) => {
                const done = scoresByPlayer[p.id]?.[currentStation] !== undefined;
                const rfid = p.ballTagId ? feed.detectionsByEpc[p.ballTagId] ?? [] : [];
                const cued = cuedPlayerId === p.id;
                // The standing cue ring outranks the ambient pulse: one tile,
                // one meaning.
                const pulsing = !cued && p.ballTagId ? pulsingEpcs.has(p.ballTagId) : false;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={[
                      styles.tile,
                      done ? styles.tileDone : "",
                      pulsing ? styles.tilePulse : "",
                      cued ? styles.tileCued : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectPlayerForCurrentStation(p)}
                    disabled={arrivalCue !== null}
                  >
                    <div className={styles.tileName}>{p.name}</div>
                    <div className={styles.tileMeta}>
                      {done ? `${scoresByPlayer[p.id][currentStation]} strokes` : "Not logged yet"}
                    </div>
                    {rfid.length > 0 && (
                      <div className={styles.rfidLine}>
                        {rfid
                          .slice(-2)
                          .map((d) => `${d.role === "start" ? "start" : "end"} ${fmtHm(d.detectedAt)}`)
                          .join(" · ")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={styles.stationNav}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={() => goToStation(currentStation - 1)}
                disabled={currentStation <= 1}
              >
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
          </section>

          <LiveFeedPanel
            current={currentStation}
            outstanding={outstanding}
            pulsingStations={pulsingStations}
            recent={recent}
            unboundEpcs={feed.unboundEpcs}
            feedDown={feed.feedDown}
            onPickStation={goToStation}
          />

          {isDemo && (
            <section className={styles.demoPanel}>
              <span className={styles.feedLabel}>Demo — fire a detection by hand</span>
              <p className={styles.demoNote}>
                No reader on this network, so these push the same rows an antenna would. Station {currentStation}:{" "}
                {outstanding.length === 1 && outstanding[0] === currentStation
                  ? "their last outstanding station, so an end-gate read here is the end of their round."
                  : `end-gate reads here show the station cue. Station ${outstanding[0] ?? 3} is their last — try it there for the round cue.`}
              </p>
              <div className={styles.demoButtons}>
                {roster.slice(0, 2).map((p) => (
                  <button key={p.id} type="button" className={styles.demoBtn} onClick={() => injectDemo("start", p)}>
                    Start gate · {p.name}
                  </button>
                ))}
                {roster.slice(0, 2).map((p) => (
                  <button
                    key={`${p.id}-end`}
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => injectDemo("end", p)}
                  >
                    End gate · {p.name}
                  </button>
                ))}
                <button type="button" className={styles.demoBtn} onClick={() => injectDemo("start")}>
                  Unlinked ball
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {step === "score" && selectedGroup && activePlayer && (
        <div className={styles.scoreLayout}>
          <p className={styles.stationProgress}>
            {stationLabel(currentStation)} · {activePlayer.name}
          </p>
          <h1 className={styles.heading}>How many strokes?</h1>
          <p className={styles.hint}>
            Your own count — the antennas only know your ball passed, never how many shots it took.
          </p>
          <div className={styles.bigStepper}>
            <button
              type="button"
              onClick={() => {
                clearCues();
                setPendingStrokes((n) => Math.max(1, n - 1));
              }}
              disabled={pendingStrokes <= 1}
              aria-label="Fewer strokes"
            >
              −
            </button>
            <span className={styles.bigStepperValue}>{pendingStrokes || "–"}</span>
            <button
              type="button"
              className={cuedPlayerId === activePlayer.id && pendingStrokes < 1 ? styles.stepperCued : ""}
              onClick={() => {
                clearCues();
                setPendingStrokes((n) => Math.min(20, n + 1));
              }}
              aria-label="More strokes"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className={`${styles.primaryBtn} ${
              cuedPlayerId === activePlayer.id && pendingStrokes >= 1 ? styles.primaryBtnCued : ""
            }`}
            onClick={saveScore}
            disabled={pendingStrokes < 1}
          >
            Save
          </button>
          <button type="button" className={styles.backLink} style={{ marginTop: 16 }} onClick={() => setStep("station")}>
            ← Back without saving
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
