// FILE: app/kiosk/useBallWatch.ts
// -----------------------------------------------------------------------------
// Follows the group's balls wherever they are.
//
// Replaces the station-scoped feed: the kiosk shouldn't need anyone to tell
// it which station or which player — a gate read already says both. This
// polls every gate read in the wave's window and hands back the ones nobody
// has announced yet, each already matched to a roster player.
//
// Polling rather than a socket: ball_detections is default-deny RLS and every
// read goes through a Server Action on the service-role client, so the
// browser holds no credentials of its own. 3s is inside the walk from an
// antenna to the screen.
//
// The first response is history, not arrivals. Opening the kiosk mid-round
// must not replay an hour of gate reads as a queue of scenes.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { BallDetection, CurrentGroup } from "@/lib/scoring/scoringRepo";
import { fetchDetectionsInWindowAction } from "@/lib/scoring/scoringActions";
import { detectionKey, type RosterEntry } from "@/lib/scoring/kioskScenes";

const POLL_MS = 3000;

export interface BallEvent extends BallDetection {
  key: string;
  playerId: string | null;
  playerName: string | null;
}

export function useBallWatch({
  group,
  roster,
  enabled,
  live,
  onEvents,
}: {
  group: CurrentGroup | null;
  roster: RosterEntry[];
  enabled: boolean;
  /** False in demo mode: nothing is polled, injected reads only. */
  live: boolean;
  onEvents: (events: BallEvent[]) => void;
}): { feedDown: boolean; inject: (rows: BallDetection[]) => void } {
  const [feedDown, setFeedDown] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const latest = useRef({ group, roster, onEvents });
  useEffect(() => {
    latest.current = { group, roster, onEvents };
  });

  const announce = useCallback((rows: BallDetection[], asHistory: boolean) => {
    const { roster: currentRoster, onEvents: emit } = latest.current;
    const byTag = new Map(currentRoster.filter((p) => p.ballTagId).map((p) => [p.ballTagId as string, p]));

    const fresh = rows.filter((row) => !seen.current.has(detectionKey(row)));
    for (const row of fresh) seen.current.add(detectionKey(row));
    if (asHistory || fresh.length === 0) return;

    emit(
      fresh.map((row) => {
        const player = byTag.get(row.epc) ?? null;
        return { ...row, key: detectionKey(row), playerId: player?.id ?? null, playerName: player?.name ?? null };
      })
    );
  }, []);

  const groupId = group?.id ?? null;
  useEffect(() => {
    if (!enabled || !groupId) return;
    seen.current = new Set();
    let cancelled = false;
    let first = true;

    async function poll() {
      const { group: currentGroup } = latest.current;
      if (!currentGroup) return;
      try {
        const rows = await fetchDetectionsInWindowAction(currentGroup.windowStartIso, currentGroup.windowEndIso);
        if (cancelled) return;
        setFeedDown(false);
        announce(rows, first);
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
  }, [enabled, live, groupId, announce]);

  const inject = useCallback((rows: BallDetection[]) => announce(rows, false), [announce]);

  return { feedDown, inject };
}
