"use client";

import { useMemo, useState } from "react";
import { TICKET_TYPE_LABELS } from "@/lib/booking/pricing";
import { matchesSearch } from "@/lib/checkin/checkin";
import type { CheckInBooking } from "@/lib/checkin/checkinRepo";
import styles from "./checkin.module.css";

/** How far either side of now counts as "at the door right now". */
const NOW_WINDOW_BEFORE_MIN = 60;
const NOW_WINDOW_AFTER_MIN = 30;

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function ArrivalsScreen({
  arrivals,
  nowMinutes,
  onOpen,
  onWalkIn,
}: {
  arrivals: CheckInBooking[];
  /** Null until the tablet's clock is read client-side — the server has no
   *  business guessing what "now" looks like at the door. */
  nowMinutes: number | null;
  onOpen: (booking: CheckInBooking) => void;
  onWalkIn: () => void;
}) {
  const [query, setQuery] = useState("");

  const { now, later, earlier } = useMemo(() => {
    const matching = arrivals.filter((b) => matchesSearch(b.leadName, query));
    if (nowMinutes === null) return { now: matching, later: [], earlier: [] };

    const groups = { now: [] as CheckInBooking[], later: [] as CheckInBooking[], earlier: [] as CheckInBooking[] };
    for (const booking of matching) {
      const delta = minutesOfDay(booking.startTime) - nowMinutes;
      if (delta > NOW_WINDOW_AFTER_MIN) groups.later.push(booking);
      else if (delta < -NOW_WINDOW_BEFORE_MIN) groups.earlier.push(booking);
      else groups.now.push(booking);
    }
    return groups;
  }, [arrivals, query, nowMinutes]);

  return (
    <>
      <h1 className={styles.heading}>Check in</h1>

      <input
        type="search"
        className={styles.search}
        placeholder="Search by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {arrivals.length === 0 && <p className={styles.emptyState}>Nothing booked today.</p>}
      {arrivals.length > 0 && now.length + later.length + earlier.length === 0 && (
        <p className={styles.emptyState}>No booking under that name.</p>
      )}

      <Section label="At the door" bookings={now} onOpen={onOpen} highlight />
      <Section label="Later today" bookings={later} onOpen={onOpen} />
      <Section label="Earlier today" bookings={earlier} onOpen={onOpen} muted />

      <div className={styles.screenFooter}>
        <button type="button" className={styles.secondaryBtn} onClick={onWalkIn}>
          Walk-in / no booking
        </button>
      </div>
    </>
  );
}

function Section({
  label,
  bookings,
  onOpen,
  highlight,
  muted,
}: {
  label: string;
  bookings: CheckInBooking[];
  onOpen: (booking: CheckInBooking) => void;
  highlight?: boolean;
  muted?: boolean;
}) {
  if (bookings.length === 0) return null;

  return (
    <section className={styles.arrivalSection}>
      <span className={styles.monoLabel}>{label}</span>
      <div className={`${styles.arrivalList} ${muted ? styles.arrivalListMuted : ""}`}>
        {bookings.map((booking) => (
          <button
            key={booking.id}
            type="button"
            className={`${styles.arrivalRow} ${highlight ? styles.arrivalRowNow : ""}`}
            onClick={() => onOpen(booking)}
          >
            <span className={styles.arrivalTime}>{booking.startTime}</span>
            <span className={styles.arrivalMain}>
              <span className={styles.arrivalName}>{booking.leadName}</span>
              <span className={styles.arrivalMeta}>
                {booking.presentHeadcount ?? booking.bookedHeadcount}{" "}
                {(booking.presentHeadcount ?? booking.bookedHeadcount) === 1 ? "player" : "players"} ·{" "}
                {TICKET_TYPE_LABELS[booking.ticketType]}
                {booking.source === "walk_in" && " · walk-in"}
              </span>
            </span>
            <span className={styles.arrivalBadges}>
              {booking.paymentStatus === "pending" && <span className={styles.badgeUnpaid}>Unpaid</span>}
              {booking.checkedInAt && <span className={styles.badgeDone}>Checked in</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
