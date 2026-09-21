"use client";

import { useEffect, useState } from "react";
import {
  MAX_HEADCOUNT,
  MIN_HEADCOUNT,
  TICKET_TYPES,
  TICKET_TYPE_LABELS,
  LIST_PRICE_PER_PERSON_CENTS,
  type TicketType,
} from "@/lib/booking/pricing";
import { isValidPlayerName } from "@/lib/checkin/checkin";
import { fetchWalkInWaveAction } from "@/lib/checkin/checkinActions";
import styles from "./checkin.module.css";

export function WalkInScreen({
  onCreate,
  busy,
  error,
}: {
  onCreate: (input: { leadName: string; ticketType: TicketType; headcount: number }) => void;
  busy: boolean;
  error: string | null;
}) {
  const [leadName, setLeadName] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("standard");
  const [headcount, setHeadcount] = useState(1);
  const [slot, setSlot] = useState<{ startTime: string; peopleLeft: number } | null>(null);
  const [slotLoaded, setSlotLoaded] = useState(false);

  // Which start time a walk-in lands in is the server's call (it's the one
  // that knows what's left) — the door only needs to see the answer.
  useEffect(() => {
    let cancelled = false;
    fetchWalkInWaveAction().then((wave) => {
      if (cancelled) return;
      setSlot(wave ? { startTime: wave.startTime, peopleLeft: wave.peopleLeft } : null);
      setSlotLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // List price, always: the pre-booking price is for people booking a venue
  // that isn't built yet, not for someone already standing in it.
  const total = (LIST_PRICE_PER_PERSON_CENTS[ticketType] * headcount) / 100;
  const tooMany = slot !== null && headcount > slot.peopleLeft;

  return (
    <>
      <span className={styles.monoLabel}>No booking</span>
      <h1 className={styles.heading}>Walk-in</h1>

      {slotLoaded && slot === null && <p className={styles.warn}>No start time is open right now.</p>}
      {slot && (
        <p className={styles.hint}>
          Goes in at {slot.startTime} — {slot.peopleLeft} {slot.peopleLeft === 1 ? "space" : "spaces"} left there.
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="walkInName">Name for the group</label>
        <input
          id="walkInName"
          type="text"
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
          placeholder="Whoever's paying"
          autoComplete="off"
          autoCapitalize="words"
        />
      </div>

      <div className={styles.field}>
        <label>Ticket</label>
        <div className={styles.choiceRow}>
          {TICKET_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.choiceBtn} ${ticketType === type ? styles.choiceBtnOn : ""}`}
              onClick={() => setTicketType(type)}
            >
              {TICKET_TYPE_LABELS[type]}
              <span className={styles.choicePrice}>${LIST_PRICE_PER_PERSON_CENTS[type] / 100} pp</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>Players</label>
        <div className={styles.stepperRow}>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => setHeadcount((n) => Math.max(MIN_HEADCOUNT, n - 1))}
            disabled={headcount <= MIN_HEADCOUNT}
            aria-label="Fewer players"
          >
            −
          </button>
          <span className={styles.stepperCount}>{headcount}</span>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => setHeadcount((n) => Math.min(MAX_HEADCOUNT, n + 1))}
            disabled={headcount >= MAX_HEADCOUNT}
            aria-label="More players"
          >
            +
          </button>
        </div>
      </div>

      <div className={styles.detailBox}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>To collect</span>
          <span className={styles.detailValue}>${total} HKD</span>
        </div>
      </div>
      <p className={styles.hint}>Take payment at the door — this screen records what&rsquo;s owed, not the transaction.</p>

      {tooMany && <p className={styles.warn}>Only {slot?.peopleLeft} left at {slot?.startTime}.</p>}
      {error && <p className={styles.error}>{error}</p>}

      <button
        type="button"
        className={styles.primaryBtn}
        onClick={() => onCreate({ leadName, ticketType, headcount })}
        disabled={busy || !isValidPlayerName(leadName) || slot === null || tooMany}
      >
        {busy ? "Starting…" : "Start check-in"}
      </button>
    </>
  );
}
