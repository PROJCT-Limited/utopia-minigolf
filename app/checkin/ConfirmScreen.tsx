"use client";

import { useState } from "react";
import { MIN_HEADCOUNT, describeTicket, maxHeadcountFor } from "@/lib/booking/pricing";
import type { CheckInBooking } from "@/lib/checkin/checkinRepo";
import styles from "./checkin.module.css";

export function ConfirmScreen({
  booking,
  present,
  onPresentChange,
  onConfirm,
  busy,
}: {
  booking: CheckInBooking;
  present: number;
  onPresentChange: (n: number) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const differs = present !== booking.bookedHeadcount;
  // A family can be 6; every other ticket tops out at 5.
  const maxPresent = maxHeadcountFor(booking.ticketType);

  return (
    <>
      <span className={styles.monoLabel}>{booking.startTime} start</span>
      <h1 className={styles.heading}>{booking.leadName}</h1>

      <div className={styles.detailBox}>
        {/* "Family ticket: 2 adults, 3 children" — the door needs the split. */}
        <Row label="Ticket" value={describeTicket(booking.ticketType, booking.bookedHeadcount)} />
        <Row
          label="Party size"
          value={
            differs ? (
              <>
                Booked {booking.bookedHeadcount} · <strong>Present {present}</strong>
              </>
            ) : (
              `${present} ${present === 1 ? "player" : "players"}`
            )
          }
        />
        <Row
          label="Payment"
          value={
            booking.paymentStatus === "paid" ? (
              booking.source === "walk_in" ? (
                "Paid at the door"
              ) : (
                "Paid"
              )
            ) : (
              <span className={styles.valueWarn}>Not paid — take payment before they play</span>
            )
          }
        />
        {booking.checkedInAt && <Row label="Status" value="Already checked in — reopening" />}
      </div>

      {adjusting ? (
        <div className={styles.adjustBlock}>
          <span className={styles.monoLabel}>Players actually here</span>
          <div className={styles.stepperRow}>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => onPresentChange(Math.max(MIN_HEADCOUNT, present - 1))}
              disabled={present <= MIN_HEADCOUNT}
              aria-label="Fewer players"
            >
              −
            </button>
            <span className={styles.stepperCount}>{present}</span>
            <button
              type="button"
              className={styles.stepperBtn}
              onClick={() => onPresentChange(Math.min(maxPresent, present + 1))}
              disabled={present >= maxPresent}
              aria-label="More players"
            >
              +
            </button>
          </div>
          {present > booking.bookedHeadcount && (
            <p className={styles.hint}>
              {present - booking.bookedHeadcount} more than booked — this takes {present - booking.bookedHeadcount} extra{" "}
              {present - booking.bookedHeadcount === 1 ? "space" : "spaces"} at {booking.startTime}, and needs paying for.
            </p>
          )}
        </div>
      ) : (
        <button type="button" className={styles.secondaryBtn} onClick={() => setAdjusting(true)}>
          Adjust party size
        </button>
      )}

      <button type="button" className={styles.primaryBtn} onClick={onConfirm} disabled={busy}>
        {busy ? "Opening…" : booking.checkedInAt ? "Reopen check-in" : "Correct — start check-in"}
      </button>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}
