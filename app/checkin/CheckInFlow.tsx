"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { TicketType } from "@/lib/booking/pricing";
import type { CheckInBooking, CheckInPlayer } from "@/lib/checkin/checkinRepo";
import {
  completeCheckInAction,
  createWalkInAction,
  fetchArrivalsAction,
  fetchGroupAction,
  registerPlayerAction,
  removePlayerAction,
  setPresentHeadcountAction,
  updatePlayerAction,
  type RegisterPlayerActionInput,
} from "@/lib/checkin/checkinActions";
import { ArrivalsScreen } from "./ArrivalsScreen";
import { ConfirmScreen } from "./ConfirmScreen";
import { PlayersScreen } from "./PlayersScreen";
import { ReadyScreen } from "./ReadyScreen";
import { WalkInScreen } from "./WalkInScreen";
import { clearDraft, dropQueued, flushQueue, queuePlayer, queuedForBooking, readDraft, saveDraft } from "./offlineQueue";
import styles from "./checkin.module.css";

/** The arrivals list is a mounted tablet's idle screen — keep it current. */
const ARRIVALS_POLL_MS = 30_000;

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

type Screen = "arrivals" | "confirm" | "players" | "ready" | "walkin";

/** A roster row as the door sees it: saved server-side, or held on this
 *  tablet until the connection comes back. */
export interface DisplayPlayer extends CheckInPlayer {
  pending?: boolean;
}

export function CheckInFlow({ initialArrivals }: { initialArrivals: CheckInBooking[] }) {
  const [screen, setScreen] = useState<Screen>("arrivals");
  const [arrivals, setArrivals] = useState(initialArrivals);
  const [booking, setBooking] = useState<CheckInBooking | null>(null);
  const [players, setPlayers] = useState<CheckInPlayer[]>([]);
  const [pending, setPending] = useState<DisplayPlayer[]>([]);
  const [present, setPresent] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  const displayPlayers: DisplayPlayer[] = [...players, ...pending];

  // ---------------------------------------------------------------------
  // Clock + arrivals polling
  // ---------------------------------------------------------------------
  useEffect(() => {
    function tick() {
      // Wave start times are venue wall-clock (Hong Kong, UTC+8), so "now"
      // has to be read the same way — the tablet's own timezone is whatever
      // it was set to, and a device an hour out would sort every arrival into
      // the wrong section.
      const hhmm = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hong_Kong",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      const [hours, minutes] = hhmm.split(":").map(Number);
      setNowMinutes(hours * 60 + minutes);
    }
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  const refreshArrivals = useCallback(async () => {
    try {
      setArrivals(await fetchArrivalsAction());
    } catch {
      /* offline — the list on screen is the last good one */
    }
  }, []);

  useEffect(() => {
    if (screen !== "arrivals") return;
    const interval = setInterval(refreshArrivals, ARRIVALS_POLL_MS);
    return () => clearInterval(interval);
  }, [screen, refreshArrivals]);

  // ---------------------------------------------------------------------
  // Offline queue
  // ---------------------------------------------------------------------
  const loadPending = useCallback((bookingId: string) => {
    setPending(
      queuedForBooking(bookingId).map((entry) => ({
        id: entry.id,
        name: entry.input.name,
        email: entry.input.email ?? null,
        ballTagId: entry.input.ballTagId ?? null,
        pending: true,
      }))
    );
  }, []);

  const sync = useCallback(async () => {
    const { synced, rejected } = await flushQueue((input) => registerPlayerAction(input));
    if (synced === 0 && rejected.length === 0) return;

    setSyncNote(
      rejected.length > 0
        ? `Synced ${synced}. Couldn't save: ${rejected.join("; ")}`
        : `${synced} ${synced === 1 ? "player" : "players"} synced.`
    );
    if (booking) {
      const group = await fetchGroupAction(booking.id);
      if (group) setPlayers(group.players);
      loadPending(booking.id);
    }
  }, [booking, loadPending]);

  // The connection is an external system, so it's subscribed to rather than
  // mirrored into state — and the server snapshot is always "online", so a
  // tablet that boots offline doesn't trip a hydration mismatch on the way in.
  const offline = useSyncExternalStore(subscribeToConnection, () => !navigator.onLine, () => false);

  useEffect(() => {
    function onOnline() {
      void sync();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);

  // ---------------------------------------------------------------------
  // Resume an interrupted check-in (reload, crash, tablet asleep)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const draft = readDraft();
    let cancelled = false;

    async function resume() {
      // Anything the last session couldn't send goes first, so the roster
      // that comes back already includes it — otherwise a just-synced player
      // would be missing from the screen until the next refresh.
      const { rejected } = await flushQueue((input) => registerPlayerAction(input));
      if (cancelled) return;
      if (rejected.length > 0) setSyncNote(`Couldn't save: ${rejected.join("; ")}`);
      if (!draft) return;

      const group = await fetchGroupAction(draft.bookingId);
      if (cancelled || !group) return;
      setBooking(group.booking);
      setPlayers(group.players);
      setPresent(draft.presentHeadcount);
      loadPending(draft.bookingId);
      setScreen(draft.screen);
    }

    resume().catch(() => {
      /* still offline on boot — staff can pick the group again by hand */
    });

    return () => {
      cancelled = true;
    };
  }, [loadPending]);

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  async function openBooking(target: CheckInBooking) {
    setError(null);
    setSyncNote(null);
    setBooking(target);
    setPresent(target.presentHeadcount ?? target.bookedHeadcount);
    setPlayers([]);
    loadPending(target.id);
    setScreen("confirm");

    try {
      const group = await fetchGroupAction(target.id);
      if (group) {
        setBooking(group.booking);
        setPlayers(group.players);
      }
    } catch {
      setError("Offline — showing what this tablet last saw.");
    }
  }

  async function confirmGroup() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const result = await setPresentHeadcountAction(booking.id, present);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save that party size.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Offline — the party size will be saved when the connection is back.");
    }
    setBusy(false);
    saveDraft({ bookingId: booking.id, presentHeadcount: present, screen: "players" });
    setScreen("players");
  }

  function backToArrivals() {
    clearDraft();
    setScreen("arrivals");
    setBooking(null);
    setPlayers([]);
    setPending([]);
    setError(null);
    setSyncNote(null);
    void refreshArrivals();
  }

  // ---------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------
  async function registerPlayer(input: { name: string; email: string | null; ballTagId: string | null }) {
    if (!booking) return { ok: false, error: "No group open." };
    const payload: RegisterPlayerActionInput = { bookingId: booking.id, ...input };

    try {
      const result = await registerPlayerAction(payload);
      if (!result.ok) return result;
      setPlayers((current) => [...current, result.player]);
      return { ok: true };
    } catch {
      // The connection dropped mid-group. Hold the player here rather than
      // making staff re-enter them, and show them as unsynced until they land.
      const entry = queuePlayer(payload);
      setPending((current) => [
        ...current,
        { id: entry.id, name: input.name, email: input.email, ballTagId: input.ballTagId, pending: true },
      ]);
      return { ok: true };
    }
  }

  async function updatePlayer(playerId: string, patch: { name?: string; ballTagId?: string | null }) {
    try {
      const result = await updatePlayerAction({ playerId, ...patch });
      if (!result.ok) return result;
      setPlayers((current) => current.map((p) => (p.id === playerId ? result.player : p)));
      return { ok: true };
    } catch {
      return { ok: false, error: "Offline — reconnect before editing a saved player." };
    }
  }

  async function removePlayer(playerId: string) {
    const queuedRow = pending.find((p) => p.id === playerId);
    if (queuedRow) {
      dropQueued(playerId);
      setPending((current) => current.filter((p) => p.id !== playerId));
      return { ok: true };
    }

    try {
      const result = await removePlayerAction(playerId);
      if (!result.ok) return result;
      setPlayers((current) => current.filter((p) => p.id !== playerId));
      return { ok: true };
    } catch {
      return { ok: false, error: "Offline — reconnect before removing a saved player." };
    }
  }

  async function startPlaying() {
    if (!booking) return;
    setBusy(true);
    try {
      const result = await completeCheckInAction(booking.id);
      if (!result.ok) {
        setError(result.error ?? "Couldn't finish check-in.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Offline — the group is registered on this tablet and will sync.");
    }
    setBusy(false);
    backToArrivals();
  }

  async function createWalkIn(input: { leadName: string; ticketType: TicketType; headcount: number }) {
    setBusy(true);
    setError(null);
    try {
      const result = await createWalkInAction(input);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      const group = await fetchGroupAction(result.bookingId);
      setBusy(false);
      if (!group) {
        setError("Walk-in created, but couldn't open it. Find it in the list.");
        return;
      }
      setBooking(group.booking);
      setPlayers(group.players);
      setPending([]);
      setPresent(input.headcount);
      saveDraft({ bookingId: group.booking.id, presentHeadcount: input.headcount, screen: "players" });
      setScreen("players");
    } catch {
      setBusy(false);
      setError("Offline — a walk-in needs a connection, since it takes a space at a start time.");
    }
  }

  // ---------------------------------------------------------------------
  return (
    <div className={styles.panel}>
      <header className={styles.topBar}>
        <span className={styles.brand}>FOUND · Check in</span>
        <span className={styles.topBarRight}>
          {(offline || pending.length > 0) && (
            <span className={styles.offlineChip}>
              {offline ? "Offline — saving on this tablet" : `${pending.length} waiting to sync`}
            </span>
          )}
          {screen !== "arrivals" && (
            <button type="button" className={styles.linkBtn} onClick={backToArrivals}>
              ← All arrivals
            </button>
          )}
        </span>
      </header>

      {syncNote && <p className={styles.syncNote}>{syncNote}</p>}

      {screen === "arrivals" && (
        <ArrivalsScreen
          arrivals={arrivals}
          nowMinutes={nowMinutes}
          onOpen={openBooking}
          onWalkIn={() => {
            setError(null);
            setScreen("walkin");
          }}
        />
      )}

      {screen === "walkin" && <WalkInScreen onCreate={createWalkIn} busy={busy} error={error} />}

      {screen === "confirm" && booking && (
        <ConfirmScreen
          booking={booking}
          present={present}
          onPresentChange={setPresent}
          onConfirm={confirmGroup}
          busy={busy}
        />
      )}

      {screen === "players" && booking && (
        <PlayersScreen
          groupName={booking.leadName}
          present={present}
          players={displayPlayers}
          onRegister={registerPlayer}
          onUpdate={updatePlayer}
          onRemove={removePlayer}
          onDone={() => {
            saveDraft({ bookingId: booking.id, presentHeadcount: present, screen: "ready" });
            setScreen("ready");
          }}
        />
      )}

      {screen === "ready" && booking && (
        <ReadyScreen
          groupName={booking.leadName}
          startTime={booking.startTime}
          present={present}
          players={displayPlayers}
          onStart={startPlaying}
          onBack={() => setScreen("players")}
          busy={busy}
        />
      )}

      {error && screen !== "walkin" && <p className={styles.error}>{error}</p>}
    </div>
  );
}
