"use client";

import { useEffect, useRef, useState } from "react";
import { formatBallTag, isValidBallTag, isValidPlayerName, rosterProgress } from "@/lib/checkin/checkin";
import { useBallReader } from "./useBallReader";
import type { DisplayPlayer } from "./CheckInFlow";
import styles from "./checkin.module.css";

type Capture = "name" | "ball";
type Result = { ok: boolean; error?: string };

export function PlayersScreen({
  groupName,
  present,
  players,
  onRegister,
  onUpdate,
  onRemove,
  onDone,
}: {
  groupName: string;
  present: number;
  players: DisplayPlayer[];
  onRegister: (input: { name: string; email: string | null; ballTagId: string | null }) => Promise<Result>;
  onUpdate: (playerId: string, patch: { name?: string; ballTagId?: string | null }) => Promise<Result>;
  onRemove: (playerId: string) => Promise<Result>;
  onDone: () => void;
}) {
  const [capture, setCapture] = useState<Capture>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTag, setManualTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const nameField = useRef<HTMLInputElement>(null);

  const progress = rosterProgress(players.length, present);
  // Once everyone confirmed present is registered the screen stops asking for
  // more — unless staff say otherwise, because a group of four does sometimes
  // turn into five at the door.
  const showCapture = !progress.complete || addingExtra;

  // The reader is armed only while a ball is actually being asked for: on the
  // name step, or with a field open, its keystrokes belong to the keyboard.
  const readerTarget: "new" | "edit" | null = editingId ? "edit" : capture === "ball" ? "new" : null;
  useBallReader(handleScan, readerTarget !== null && !manualOpen);

  useEffect(() => {
    if (capture === "name" && !editingId) nameField.current?.focus();
  }, [capture, editingId, players.length]);

  async function handleScan(tag: string) {
    if (busy) return;
    if (editingId) {
      await saveEdit(editingId, { ballTagId: tag });
      return;
    }
    await register(tag);
  }

  async function register(ballTagId: string | null) {
    setBusy(true);
    setError(null);
    const result = await onRegister({ name, email: email.trim() || null, ballTagId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save that player.");
      return;
    }

    setLinked(ballTagId);
    setTimeout(() => setLinked(null), 1600);
    setName("");
    setEmail("");
    setManualTag("");
    setManualOpen(false);
    setAddingExtra(false);
    setCapture("name");
  }

  async function saveEdit(playerId: string, patch: { name?: string; ballTagId?: string | null }) {
    setBusy(true);
    setError(null);
    const result = await onUpdate(playerId, patch);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save that change.");
      return;
    }
    setEditingId(null);
    setManualOpen(false);
    setManualTag("");
  }

  async function removePlayer(playerId: string) {
    setBusy(true);
    setError(null);
    const result = await onRemove(playerId);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Couldn't remove that player.");
    else setEditingId(null);
  }

  function startEditing(player: DisplayPlayer) {
    setEditingId(player.id);
    setEditName(player.name);
    setManualOpen(false);
    setManualTag("");
    setError(null);
  }

  return (
    <>
      <span className={styles.monoLabel}>
        {showCapture
          ? `${groupName} · player ${addingExtra ? players.length + 1 : progress.position} of ${addingExtra ? players.length + 1 : progress.total}`
          : `${groupName} · everyone registered`}
      </span>

      {!showCapture ? (
        <>
          <h1 className={styles.heading}>Roster ready</h1>
          <p className={styles.hint}>All {progress.total} registered. Fix a name, add someone extra, or move on.</p>
        </>
      ) : capture === "name" ? (
        <>
          <h1 className={styles.heading}>Who&rsquo;s playing?</h1>
          <div className={styles.field}>
            <label htmlFor="playerName">Player name</label>
            <input
              id="playerName"
              ref={nameField}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name is enough"
              autoComplete="off"
              autoCapitalize="words"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="playerEmail">Email (optional)</label>
            <input
              id="playerEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="For their score afterwards"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setError(null);
              setCapture("ball");
            }}
            disabled={!isValidPlayerName(name)}
          >
            Next — link their ball
          </button>
        </>
      ) : (
        <>
          <h1 className={styles.heading}>{name}&rsquo;s ball</h1>
          {!manualOpen ? (
            <>
              <div className={styles.scanTarget}>
                <span className={styles.scanPulse} aria-hidden />
                <span className={styles.scanText}>Place this player&rsquo;s ball on the reader</span>
              </div>
              <div className={styles.overrideRow}>
                <button type="button" className={styles.linkBtn} onClick={() => setManualOpen(true)}>
                  Enter manually / skip ball
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => setCapture("name")}>
                  ← Back to name
                </button>
              </div>
            </>
          ) : (
            <div className={styles.manualPanel}>
              <div className={styles.field}>
                <label htmlFor="manualTag">Ball ID</label>
                <input
                  id="manualTag"
                  type="text"
                  value={manualTag}
                  onChange={(e) => setManualTag(e.target.value)}
                  placeholder="e.g. A2 — from the sticker on the ball"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => register(manualTag)}
                disabled={!isValidBallTag(manualTag) || busy}
              >
                Link this ball
              </button>
              <div className={styles.overrideRow}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setManualOpen(false);
                    setManualTag("");
                  }}
                >
                  ← Try the reader again
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => register(null)} disabled={busy}>
                  Register with no ball
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {linked && <p className={styles.linkedToast}>Ball linked ✓ — {formatBallTag(linked)}</p>}
      {linked === null && busy && <p className={styles.hint}>Saving…</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.rosterBlock}>
        <span className={styles.monoLabel}>Registered</span>
        {players.length === 0 && <p className={styles.hint}>Nobody yet.</p>}
        <div className={styles.rosterList}>
          {players.map((player, i) =>
            editingId === player.id ? (
              <div key={player.id} className={styles.rosterEdit}>
                <div className={styles.field}>
                  <label htmlFor={`edit-${player.id}`}>Name</label>
                  <input
                    id={`edit-${player.id}`}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <p className={styles.hint}>
                  {player.ballTagId
                    ? `Ball ${formatBallTag(player.ballTagId)} — place a different ball on the reader to re-link it.`
                    : "No ball linked — place one on the reader to link it now."}
                </p>
                <div className={styles.editActions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => saveEdit(player.id, { name: editName })}
                    disabled={!isValidPlayerName(editName) || busy}
                  >
                    Save
                  </button>
                  <button type="button" className={styles.linkBtn} onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  {player.ballTagId && (
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => saveEdit(player.id, { ballTagId: null })}
                      disabled={busy}
                    >
                      Unlink ball
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => removePlayer(player.id)}
                    disabled={busy}
                  >
                    Remove player
                  </button>
                </div>
              </div>
            ) : (
              <div key={player.id} className={styles.rosterRow}>
                <span className={styles.rosterIndex}>{i + 1}</span>
                <span className={styles.rosterName}>
                  {player.name}
                  {player.pending && <span className={styles.pendingChip}>waiting to sync</span>}
                </span>
                <span className={player.ballTagId ? styles.rosterBall : styles.rosterBallMissing}>
                  {player.ballTagId ? formatBallTag(player.ballTagId) : "No ball"}
                </span>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => startEditing(player)}
                  disabled={player.pending}
                >
                  Edit
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {!showCapture && (
        <div className={styles.screenFooter}>
          <button type="button" className={styles.primaryBtn} onClick={onDone}>
            Review roster
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              setAddingExtra(true);
              setCapture("name");
            }}
          >
            Add another player
          </button>
        </div>
      )}
    </>
  );
}
