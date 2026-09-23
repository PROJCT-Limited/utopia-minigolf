"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { BallDetection, CurrentGroup, RosterPlayer } from "@/lib/scoring/scoringRepo";
import { STATION_NUMBERS } from "@/lib/scoring/stations";
import {
  SCENE_MS,
  arrivalScene,
  champions,
  cheerContext,
  cheerScene,
  finaleScenes,
  roundIsComplete,
  standings,
  standingsScene,
  stationsLeft,
  type Scene,
} from "@/lib/scoring/kioskScenes";
import {
  fetchCurrentGroupsAction,
  fetchRosterForGroupAction,
  createBookingRosterAction,
  fetchScoresForRosterAction,
  saveStationScoreAction,
} from "@/lib/scoring/scoringActions";
import { useBallWatch, type BallEvent } from "./useBallWatch";
import { SceneCard } from "./SceneCard";
import { Countdown } from "./Countdown";
import { RevealScene, WinnerScene } from "./FinaleScenes";
import { Eyebrow } from "./Eyebrow";
import { Scoreboard } from "./Scoreboard";
import { DEMO_GROUP_ID, DEMO_ROSTER, demoDetection, demoScores } from "./demoFeed";
import {
  audioReadyServerSnapshot,
  audioReadySnapshot,
  installUnlockListeners,
  playCueSound,
  subscribeAudioReady,
  unlockCueSounds,
} from "./cueSounds";
import styles from "./kiosk.module.css";

/** Who's on the course changes every few minutes; this screen idles all day. */
const GROUPS_POLL_MS = 20_000;
/** Scenes are a queue, not a stack, but a queue that can grow without bound
 *  would leave the screen minutes behind the floor. Four is two players'
 *  worth of beats — anything older than that has been overtaken by events. */
const MAX_QUEUE = 4;

type Mode = "rest" | "strokes";

export function KioskFlow({ initialGroups, demo = false }: { initialGroups: CurrentGroup[]; demo?: boolean }) {
  const [groups, setGroups] = useState(initialGroups);
  // One group on the course means no question to ask: the kiosk opens on it.
  // Picking by hand only exists for the case the floor can't disambiguate yet
  // — see the note on groupChoice below.
  const [group, setGroup] = useState<CurrentGroup | null>(() => {
    if (demo) return DEMO_GROUP;
    return initialGroups.length === 1 ? initialGroups[0] : null;
  });
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [rosterNames, setRosterNames] = useState<string[] | null>(null);
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, Record<number, number>>>({});
  const [loading, setLoading] = useState(false);

  const [queue, setQueue] = useState<Scene[]>([]);
  const [mode, setMode] = useState<Mode>("rest");
  const [target, setTarget] = useState<{ playerId: string; station: number } | null>(null);
  const [pendingStrokes, setPendingStrokes] = useState(0);
  const [stationChoice, setStationChoice] = useState<string | null>(null);
  // Which station's column the card shows when nothing is playing: the last
  // one the floor reported, because that's where the group actually is.
  // Falling back to station 1 made the resting card quietly show the wrong
  // column for a group that started anywhere else.
  const [lastStation, setLastStation] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Sound is always on. This is only whether the browser has let it start
  // yet — it needs one gesture on the page, which a mounted tablet might not
  // get for an hour, so the screen asks for it rather than staying quiet for
  // no visible reason.
  const audioReady = useSyncExternalStore(subscribeAudioReady, audioReadySnapshot, audioReadyServerSnapshot);
  useEffect(() => installUnlockListeners(), []);

  const isDemo = group?.id === DEMO_GROUP_ID;
  const scene = queue[0] ?? null;
  const live = useRef({ roster, scoresByPlayer, group, mode, target, queued: queue.length });
  useEffect(() => {
    live.current = { roster, scoresByPlayer, group, mode, target, queued: queue.length };
  });

  const push = useCallback((...scenes: Scene[]) => {
    setQueue((current) => [...current, ...scenes].slice(-MAX_QUEUE));
  }, []);

  // ---------------------------------------------------------------------
  // Gate reads become scenes
  // ---------------------------------------------------------------------
  const handleEvents = useCallback(
    (events: BallEvent[]) => {
      const { roster: currentRoster, scoresByPlayer: scores, group: currentGroup } = live.current;
      const groupName = currentGroup?.displayName ?? "This group";

      for (const event of events) {
        setLastStation(event.stationNumber);
        if (event.role === "start") {
          // Name first, then where that name sits in the group — the order
          // someone walking up actually wants them in.
          const board = standings(currentRoster, scores, event.stationNumber);
          const row = board.find((r) => r.playerId === event.playerId);
          push(
            arrivalScene({
              stationNumber: event.stationNumber,
              playerId: event.playerId,
              playerName: event.playerName,
              groupName,
            }),
            standingsScene({
              stationNumber: event.stationNumber,
              playerId: event.playerId,
              playerName: event.playerName,
              groupName,
              place: row?.place ?? null,
              fieldSize: board.filter((r) => r.place !== null).length,
            })
          );
          playCueSound("arrival");
          continue;
        }

        const context = cheerContext(currentRoster, scores, event.playerId, event.stationNumber);
        push(
          cheerScene({
            stationNumber: event.stationNumber,
            playerId: event.playerId,
            playerName: event.playerName,
            context,
          })
        );
        playCueSound(context.roundFinishes ? "cheerRound" : "cheer");
      }
    },
    [push]
  );

  const watch = useBallWatch({
    group,
    roster,
    enabled: group !== null && rosterNames === null,
    live: !isDemo,
    onEvents: handleEvents,
  });

  // ---------------------------------------------------------------------
  // The scene clock
  // ---------------------------------------------------------------------
  const advance = useCallback(() => {
    setQueue((current) => {
      const [done, ...rest] = current;
      if (done?.then === "strokes" && done.playerId) {
        setTarget({ playerId: done.playerId, station: done.stationNumber });
        setPendingStrokes(live.current.scoresByPlayer[done.playerId]?.[done.stationNumber] ?? 0);
        setMode("strokes");
      }
      return rest;
    });
  }, []);

  const sceneId = scene?.id ?? null;
  const sceneHold = scene?.holdMs ?? 0;
  const sceneKind = scene?.kind ?? null;

  // The fanfare belongs to the winner scene itself rather than to the save
  // that triggered the finale — the countdown and the reveal happen in
  // between, and a cheer landing three seconds early gives the result away.
  useEffect(() => {
    if (sceneKind === "winner") playCueSound("fanfare");
  }, [sceneId, sceneKind]);
  useEffect(() => {
    if (!sceneId) return;
    const timer = window.setTimeout(advance, sceneHold);
    return () => window.clearTimeout(timer);
  }, [sceneId, sceneHold, advance]);

  // ---------------------------------------------------------------------
  // Group + roster
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (group || demo) return;
    const interval = setInterval(async () => {
      const fresh = await fetchCurrentGroupsAction();
      setGroups(fresh);
      if (fresh.length === 1) setGroup(fresh[0]);
    }, GROUPS_POLL_MS);
    return () => clearInterval(interval);
  }, [group, demo]);

  const groupId = group?.id ?? null;
  useEffect(() => {
    if (!groupId) return;
    const id = groupId;
    let cancelled = false;

    async function load() {
      if (id === DEMO_GROUP_ID) {
        setRoster(DEMO_ROSTER);
        setScoresByPlayer(demoScores());
        setRosterNames(null);
        return;
      }
      setLoading(true);
      const players = await fetchRosterForGroupAction(id);
      if (cancelled) return;
      if (players.length === 0) {
        // Nobody was named at the door — the kiosk still has to be able to
        // open a card, so it asks once and then never again for this group.
        setRosterNames(Array(live.current.group?.playerCount ?? 1).fill(""));
        setLoading(false);
        return;
      }
      setRoster(players);
      setScoresByPlayer(await fetchScoresForRosterAction(players.map((p) => p.id)));
      setRosterNames(null);
      setLoading(false);
    }

    void load().catch(() => {
      if (!cancelled) {
        setError("Couldn't load that group.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  async function submitRoster() {
    if (!group || !rosterNames) return;
    setLoading(true);
    const result = await createBookingRosterAction(group.id, rosterNames);
    setLoading(false);
    if (!result.ok || !result.players) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setRoster(result.players);
    setScoresByPlayer(await fetchScoresForRosterAction(result.players.map((p) => p.id)));
    setRosterNames(null);
  }

  // ---------------------------------------------------------------------
  // Scores
  // ---------------------------------------------------------------------
  async function saveScore() {
    if (!target || !group) return;
    const player = roster.find((p) => p.id === target.playerId);
    if (!player) return;

    if (!isDemo) {
      const result = await saveStationScoreAction(player.id, target.station, pendingStrokes);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save that score.");
        return;
      }
    }

    const saved = pendingStrokes;
    setScoresByPlayer((current) => ({
      ...current,
      [player.id]: { ...current[player.id], [target.station]: saved },
    }));
    setError(null);
    setMode("rest");
    setTarget(null);
    playCueSound("logged");

    const nextScores = {
      ...live.current.scoresByPlayer,
      [player.id]: { ...live.current.scoresByPlayer[player.id], [target.station]: saved },
    };

    // Was that the last score in the round? Then the screen stops being a
    // scoreboard and becomes an announcement.
    if (roundIsComplete(roster, nextScores)) {
      setQueue(finaleScenes(roster, nextScores, group.displayName));
      return;
    }

    // Otherwise: straight back to the scoreboard with their number on it —
    // the last beat of the loop, and the same scene the arrival beat ends on.
    push(
      standingsScene({
        stationNumber: target.station,
        playerId: player.id,
        playerName: player.name,
        groupName: group.displayName,
        justLogged: saved,
      })
    );
  }

  function leaveStrokes() {
    setMode("rest");
    setTarget(null);
    setError(null);
  }

  // ---------------------------------------------------------------------
  // Demo
  // ---------------------------------------------------------------------
  const demoRun = useRef<{ cancelled: boolean } | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);
  // The script runs across many renders, so it can't call the saveScore it
  // closed over when it started — that one still thinks no player is being
  // scored. It calls whichever one is current instead.
  const saveRef = useRef(saveScore);
  useEffect(() => {
    saveRef.current = saveScore;
  });

  function fire(role: "start" | "end", station: number, player?: RosterPlayer) {
    unlockCueSounds();
    const row: BallDetection = demoDetection({
      role,
      station,
      player: player ? { id: player.id, name: player.name, ballTagId: player.ballTagId } : undefined,
    });
    watch.inject([row]);
  }

  async function playDemo() {
    if (demoRun.current) demoRun.current.cancelled = true; // stop a run already in flight
    const run = { cancelled: false };
    demoRun.current = run;
    setDemoPlaying(true);
    unlockCueSounds();

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    /** Waits on what the screen is actually doing rather than on how long it
     *  was expected to take. The first version of this slept for the scene
     *  durations and raced them — the scene clock reset the stroke counter
     *  after the script had set it, and a player went on the card with a
     *  zero. */
    const until = async (ready: () => boolean, timeoutMs = 25_000) => {
      const startedAt = Date.now();
      while (!ready()) {
        if (run.cancelled || Date.now() - startedAt > timeoutMs) return false;
        await sleep(120);
      }
      return !run.cancelled;
    };
    const scenesDone = () => live.current.queued === 0;

    async function playThrough(player: RosterPlayer, strokes: number) {
      // Walk up: the floor sees the ball and says who it belongs to, then
      // shows them where they stand.
      fire("start", 3, player);
      if (!(await until(() => live.current.queued > 0))) return;
      if (!(await until(scenesDone))) return;
      await sleep(600);

      // Hole out: the cheer, then the one screen anybody touches.
      fire("end", 3, player);
      if (!(await until(() => live.current.mode === "strokes" && live.current.target?.playerId === player.id)))
        return;
      await sleep(800);
      setPendingStrokes(strokes);
      await sleep(1500); // long enough to see the number land before it's saved
      await saveRef.current();

      // Back to the card with their score on it.
      if (!(await until(scenesDone))) return;
      await sleep(600);
    }

    /** Jo checked in without a ball, so Jo goes on by hand — which is also
     *  the path that has to keep working when a gate misses. */
    async function playByHand(player: RosterPlayer, strokes: number) {
      setStationChoice(player.id);
      await sleep(1300);
      setStationChoice(null);
      setTarget({ playerId: player.id, station: 3 });
      setPendingStrokes(0);
      setMode("strokes");
      await sleep(1100);
      setPendingStrokes(strokes);
      await sleep(1500);
      await saveRef.current();
    }

    const [mika, ravi, jo] = DEMO_ROSTER as RosterPlayer[];
    await playThrough(mika, 3);
    if (!run.cancelled) await playThrough(ravi, 5);
    // Jo's is the last score in the round, so this is what triggers the
    // countdown and the reveal.
    if (!run.cancelled) await playByHand(jo, 2);
    if (!run.cancelled) {
      await until(() => live.current.queued === 0, 40_000);
      setDemoPlaying(false);
    }
  }

  function stopDemo() {
    if (demoRun.current) demoRun.current.cancelled = true;
    setDemoPlaying(false);
    setQueue([]);
    setMode("rest");
    setTarget(null);
    setScoresByPlayer(demoScores());
  }

  // ---------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------
  const remainingForDefault = stationsLeft(roster, scoresByPlayer);
  const stationNumber = target?.station ?? scene?.stationNumber ?? lastStation ?? remainingForDefault[0] ?? 1;
  const rows = useMemo(() => standings(roster, scoresByPlayer, stationNumber), [roster, scoresByPlayer, stationNumber]);
  const remaining = remainingForDefault;
  const targetPlayer = roster.find((p) => p.id === target?.playerId) ?? null;

  // ---------------------------------------------------------------------
  return (
    <div className={`${styles.stage} ${isDemo ? styles.stageDemo : ""}`} onPointerDown={unlockCueSounds}>
      {/* Two things can appear over a scene, and neither is chrome: a note
          that audio is waiting for its first touch, and a warning that the
          antennas have gone quiet. Both disappear the moment they're no
          longer true. */}
      {!audioReady && <span className={styles.soundNote}>Tap anywhere for sound</span>}
      {watch.feedDown && !isDemo && <span className={styles.feedDown}>No antenna feed</span>}

      {/* No group yet: either nothing is on the course, or the floor can't
          say which of several it is. Both are waiting states, not menus. */}
      {!group && (
        <section className={styles.waiting}>
          <h1 className={styles.waitingHeadline}>
            {groups.length === 0 ? "Nobody on the course" : "Which group?"}
          </h1>
          {groups.length === 0 ? (
            <p className={styles.waitingSupport}>This screen wakes up when a round starts.</p>
          ) : (
            <>
              <p className={styles.waitingSupport}>
                More than one round is running, so tap the one at this station.
              </p>
              <div className={styles.groupPick}>
                {groups.map((g) => (
                  <button key={g.id} type="button" className={styles.groupBtn} onClick={() => setGroup(g)}>
                    <span className={styles.groupBtnTime}>{g.timeLabel}</span>
                    <span className={styles.groupBtnName}>{g.displayName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {group && rosterNames && (
        <section className={styles.waiting}>
          <h1 className={styles.waitingHeadline}>Who&rsquo;s playing?</h1>
          <p className={styles.waitingSupport}>
            Nobody was named at the door, so the scoreboard is empty. Add the names once.
          </p>
          <div className={styles.nameList}>
            {rosterNames.map((name, i) => (
              <input
                key={i}
                type="text"
                className={styles.nameInput}
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) =>
                  setRosterNames((names) => (names ?? []).map((n, idx) => (idx === i ? e.target.value : n)))
                }
              />
            ))}
          </div>
          <button type="button" className={styles.bigBtn} onClick={submitRoster} disabled={loading}>
            {loading ? "Starting…" : "Start the scoreboard"}
          </button>
        </section>
      )}

      {group && !rosterNames && (
        <>
          {scene && (scene.kind === "arrival" || scene.kind === "cheer") && (
            <SceneCard scene={scene} onSkip={advance} />
          )}

          {scene?.kind === "countdown" && (
            <section className={`${styles.scene} ${styles.sceneFull} ${styles.sceneBig}`} onClick={advance}>
              <Eyebrow parts={scene.eyebrow} />
              <Countdown />
              <span className={styles.sceneSupport}>{scene.support}</span>
            </section>
          )}

          {scene?.kind === "reveal" && (
            <section className={`${styles.scene} ${styles.sceneFull} ${styles.sceneBig}`} onClick={advance}>
              <RevealScene scene={scene} rows={rows} />
            </section>
          )}

          {scene?.kind === "winner" && (
            <section className={`${styles.scene} ${styles.sceneFull} ${styles.sceneBig}`} onClick={advance}>
              <WinnerScene
                scene={scene}
                winners={champions(rows)}
                roster={roster}
                scoresByPlayer={scoresByPlayer}
              />
            </section>
          )}

          {scene?.kind === "standings" && (
            <section
              className={`${styles.boardScene} ${styles.boardSceneTimed}`}
              onClick={advance}
              style={{ "--scene-ms": `${SCENE_MS.standings}ms` } as React.CSSProperties}
            >
              <Eyebrow parts={scene.eyebrow} />
              <h1 className={styles.boardHeadline}>{scene.headline}</h1>
              <p className={styles.boardSupport}>{scene.support}</p>
              <Scoreboard
                rows={rows}
                stationNumber={scene.stationNumber}
                stationsRemaining={remaining}
                highlightPlayerId={scene.playerId}
                interactive={false}
                onPick={() => {}}
              />
              <span className={styles.sceneClock} aria-hidden>
                <span className={styles.sceneClockFill} />
              </span>
            </section>
          )}

          {!scene && mode === "strokes" && targetPlayer && (
            <section className={styles.strokes}>
              <Eyebrow parts={[targetPlayer.name, `Station ${target?.station}`]} />
              <h1 className={styles.strokesHeadline}>How many strokes?</h1>
              <div className={styles.counter}>
                <button
                  type="button"
                  className={styles.counterBtn}
                  onClick={() => setPendingStrokes((n) => Math.max(1, n - 1))}
                  disabled={pendingStrokes <= 1}
                  aria-label="Fewer strokes"
                >
                  −
                </button>
                <span className={styles.counterValue}>{pendingStrokes || "–"}</span>
                <button
                  type="button"
                  className={`${styles.counterBtn} ${pendingStrokes < 1 ? styles.counterBtnCued : ""}`}
                  onClick={() => setPendingStrokes((n) => Math.min(20, n + 1))}
                  aria-label="More strokes"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className={`${styles.bigBtn} ${pendingStrokes >= 1 ? styles.bigBtnCued : ""}`}
                onClick={saveScore}
                disabled={pendingStrokes < 1}
              >
                Add to the scoreboard
              </button>
              <button type="button" className={styles.quietBtn} onClick={leaveStrokes}>
                Not you? Go back
              </button>
              {error && <p className={styles.error}>{error}</p>}
            </section>
          )}

          {!scene && mode === "rest" && (
            <section className={styles.boardScene}>
              <Eyebrow
                parts={[
                  group.displayName,
                  remaining.length === 0 ? "Round complete" : `Station ${remaining[0]} next`,
                ]}
              />
              <h1 className={styles.boardHeadline}>Scoreboard</h1>
              <p className={styles.boardSupport}>Roll a ball past a gate, or tap a name to score by hand.</p>
              <Scoreboard
                rows={rows}
                stationNumber={stationNumber}
                stationsRemaining={remaining}
                highlightPlayerId={null}
                interactive
                onPick={(playerId) => setStationChoice(playerId)}
              />
              {error && <p className={styles.error}>{error}</p>}
            </section>
          )}

          {/* Manual path. The antennas are not allowed to be the only way a
              score can be entered — if a gate misses, a person still has to
              be able to put a number on the card. */}
          {stationChoice && (
            <div className={styles.sheet}>
              <Eyebrow parts={[roster.find((p) => p.id === stationChoice)?.name ?? "Player", "Which station?"]} />
              <div className={styles.stationPick}>
                {STATION_NUMBERS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={styles.stationBtn}
                    onClick={() => {
                      setTarget({ playerId: stationChoice, station: n });
                      setPendingStrokes(scoresByPlayer[stationChoice]?.[n] ?? 0);
                      setMode("strokes");
                      setStationChoice(null);
                    }}
                  >
                    {n}
                    <span className={styles.stationBtnState}>
                      {scoresByPlayer[stationChoice]?.[n] !== undefined
                        ? `${scoresByPlayer[stationChoice][n]} in`
                        : "open"}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className={styles.quietBtn} onClick={() => setStationChoice(null)}>
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {isDemo && (
        <footer className={styles.demoBar}>
          <span className={styles.demoChip}>demo — nothing is saved</span>
          <button
            type="button"
            className={styles.demoPlay}
            onClick={demoPlaying ? stopDemo : playDemo}
          >
            {demoPlaying ? "■ Stop" : "▶ Play the whole thing"}
          </button>
          <span className={styles.demoHint}>
            or fire one read at a time — station 3 is this group&rsquo;s last, so an end gate there ends the round
          </span>
          <div className={styles.demoButtons}>
            {DEMO_ROSTER.slice(0, 2).map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.demoBtn}
                onClick={() => fire("start", 3, p as RosterPlayer)}
              >
                start {p.name}
              </button>
            ))}
            {DEMO_ROSTER.slice(0, 2).map((p) => (
              <button
                key={`${p.id}-end`}
                type="button"
                className={styles.demoBtn}
                onClick={() => fire("end", 3, p as RosterPlayer)}
              >
                end {p.name}
              </button>
            ))}
            <button type="button" className={styles.demoBtn} onClick={() => fire("start", 2, undefined)}>
              unknown ball
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

const DEMO_GROUP: CurrentGroup = {
  id: DEMO_GROUP_ID,
  timeLabel: "demo",
  ticketType: "standard",
  displayName: "Demo group",
  playerCount: DEMO_ROSTER.length,
  windowStartIso: new Date(0).toISOString(),
  windowEndIso: new Date(0).toISOString(),
};
