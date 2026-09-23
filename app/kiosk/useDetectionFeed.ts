// FILE: app/kiosk/useDetectionFeed.ts
// -----------------------------------------------------------------------------
// Watches the RFID feed for one group at one station and hands back both the
// rows (for display) and the *new* arrivals (as cues to animate).
//
// Polling, not a realtime subscription: ball_detections is default-deny RLS
// and every read in this app goes through the service-role client behind a
// Server Action, so the browser has no credentials to hold a socket with.
// A 3s poll is well inside human reaction time for someone walking from an
// antenna to the tablet, and the query is two indexed reads scoped to one
// station and one wave window.
//
// The first response of a station is treated as history, never as arrivals:
// a player opening Station 3 must not be met with a banner for the ball they
// rolled five minutes ago. Only rows that appear after the kiosk started
// looking become cues.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { BallDetection, CurrentGroup } from "@/lib/scoring/scoringRepo";
import { fetchBallDetectionsForGroupAction } from "@/lib/scoring/scoringActions";
import {
  cuesFromDetections,
  detectionKey,
  flattenDetections,
  stationFinishesRound,
  type DetectionCue,
  type RosterEntry,
} from "@/lib/scoring/ballFeedback";

const POLL_MS = 3000;

export interface DetectionFeed {
  detectionsByEpc: Record<string, BallDetection[]>;
  unboundEpcs: string[];
  /** True once a poll has failed — the relay or the table isn't there. Shown
   *  to staff rather than swallowed, since a dead feed looks identical to
   *  "nobody has rolled a ball yet". */
  feedDown: boolean;
  /** Push synthetic rows through the exact same pipeline the antennas use.
   *  Demo mode only (see demoFeed.ts): hardware and the relay aren't
   *  available to build against yet. */
  injectDetections: (rows: BallDetection[]) => void;
}

export function useDetectionFeed({
  group,
  roster,
  station,
  scoresByPlayer,
  enabled,
  live,
  onCues,
}: {
  group: CurrentGroup | null;
  roster: RosterEntry[];
  station: number;
  scoresByPlayer: Record<string, Record<number, number>>;
  /** False on the group picker and roster screens — nothing to watch yet. */
  enabled: boolean;
  /** False in demo mode: no polling, injected rows only. */
  live: boolean;
  onCues: (cues: DetectionCue[]) => void;
}): DetectionFeed {
  // Rows are stored together with the station they were read at, and the
  // station being displayed is what decides whether they count. That's what
  // keeps a tile from claiming a ball was seen here when it was seen next
  // door — without an effect that wipes state on every station change.
  const [snapshot, setSnapshot] = useState<{
    station: number;
    rowsByEpc: Record<string, BallDetection[]>;
    unboundEpcs: string[];
  }>({ station: -1, rowsByEpc: {}, unboundEpcs: [] });
  const [feedDown, setFeedDown] = useState(false);

  const fresh = snapshot.station === station;
  const detectionsByEpc = fresh ? snapshot.rowsByEpc : {};
  const unboundEpcs = fresh ? snapshot.unboundEpcs : [];

  // Everything the poll body needs, read through refs: the interval is set up
  // once per station and must not be torn down and restarted every time a
  // score lands or the roster array is re-created by a render.
  const seen = useRef<Set<string>>(new Set());
  const latest = useRef({ group, roster, station, scoresByPlayer, onCues });
  useEffect(() => {
    latest.current = { group, roster, station, scoresByPlayer, onCues };
  });

  const absorb = useCallback((rows: BallDetection[], asHistory: boolean) => {
    const { roster: currentRoster, scoresByPlayer: scores, station: currentStation, onCues: emit } = latest.current;

    if (!asHistory) {
      const cues = cuesFromDetections(rows, seen.current, currentRoster, {
        roundFinishes: stationFinishesRound(scores, currentRoster, currentStation),
      });
      if (cues.length > 0) emit(cues);
    }
    for (const row of rows) seen.current.add(detectionKey(row));
  }, []);

  // One baseline read plus a poll, per station. Resetting `seen` here is what
  // makes each station its own slate: walking back to a station you already
  // played shows its history without re-announcing it.
  const groupId = group?.id ?? null;
  useEffect(() => {
    if (!enabled || !groupId) return;
    seen.current = new Set();
    let cancelled = false;
    let first = true;

    async function poll() {
      const { group: currentGroup, roster: currentRoster, station: currentStation } = latest.current;
      if (!currentGroup) return;
      try {
        const result = await fetchBallDetectionsForGroupAction(
          currentRoster.map((p) => ({ id: p.id, ballTagId: p.ballTagId })),
          currentStation,
          currentGroup.windowStartIso,
          currentGroup.windowEndIso
        );
        if (cancelled) return;
        setSnapshot({
          station: currentStation,
          rowsByEpc: result.rowsByEpc,
          unboundEpcs: result.unboundEpcs,
        });
        setFeedDown(false);
        absorb(flattenDetections(result.rowsByEpc), first);
        first = false;
      } catch {
        if (!cancelled) setFeedDown(true);
      }
    }

    void poll();
    if (!live) return () => { cancelled = true; };

    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, live, groupId, station, absorb]);

  const injectDetections = useCallback(
    (rows: BallDetection[]) => {
      const at = latest.current.station;
      setSnapshot((current) => {
        const rowsByEpc = current.station === at ? { ...current.rowsByEpc } : {};
        for (const row of rows) rowsByEpc[row.epc] = [...(rowsByEpc[row.epc] ?? []), row];
        return { station: at, rowsByEpc, unboundEpcs: current.station === at ? current.unboundEpcs : [] };
      });
      absorb(rows, false);
    },
    [absorb]
  );

  return { detectionsByEpc, unboundEpcs, feedDown, injectDetections };
}
