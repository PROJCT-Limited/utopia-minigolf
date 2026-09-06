"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { TICKET_TYPE_LABELS, type TicketType } from "@/lib/booking/pricing";
import { formatWaveDate } from "../../utils/formatWave";
import sharedStyles from "../../components/found/shared.module.css";
import styles from "../../confirmation.module.css";

interface BookingForView {
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  ticketType: TicketType;
  amountPaidCents: number;
  currency: string;
  waveDate: string;
  waveStartTime: string;
  waveStatus: "provisional" | "confirmed" | "full";
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 12; // ~30s

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-HK", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function ConfirmationView({
  bookingId,
  initialStatus,
  initialBooking,
}: {
  bookingId: string;
  initialStatus: "pending" | "paid" | "cancelled";
  initialBooking: BookingForView;
}) {
  const [status, setStatus] = useState(initialStatus);
  const pollCount = useRef(0);

  useEffect(() => {
    if (status !== "pending") return;

    const interval = setInterval(async () => {
      pollCount.current += 1;
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== "pending") {
            setStatus(data.status);
            clearInterval(interval);
          }
        }
      } catch {
        // transient — the next tick will retry
      }
      if (pollCount.current >= MAX_POLLS) clearInterval(interval);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, bookingId]);

  if (status === "pending") {
    return (
      <div className={styles.card}>
        <p className={styles.pending}>Confirming your payment&hellip; this only takes a moment.</p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={styles.card}>
        <span className={styles.kicker}>Booking failed</span>
        <h1 className={styles.title}>This booking didn&rsquo;t go through</h1>
        <p className={styles.body}>Nothing was charged. Please try again.</p>
        <div className={styles.actions}>
          <Link href="/book" className={sharedStyles.pillBtn}>
            Back to booking →
          </Link>
        </div>
      </div>
    );
  }

  const firstName = initialBooking.leadName.trim().split(/\s+/)[0] || initialBooking.leadName;
  const waveIsConfirmed = initialBooking.waveStatus === "confirmed" || initialBooking.waveStatus === "full";

  return (
    <div className={styles.card}>
      <span className={styles.kicker}>Booking confirmed</span>
      <h1 className={styles.title}>You&rsquo;re in, {firstName}.</h1>

      <div className={styles.box}>
        <div className={styles.row}>
          <span className={sharedStyles.detailLabel}>Party</span>
          <span className={sharedStyles.detailValue}>
            {initialBooking.partyType}, {initialBooking.headcount} {initialBooking.headcount === 1 ? "player" : "players"}
          </span>
        </div>
        <div className={styles.row}>
          <span className={sharedStyles.detailLabel}>Ticket</span>
          <span className={sharedStyles.detailValue}>{TICKET_TYPE_LABELS[initialBooking.ticketType]}</span>
        </div>
        <div className={styles.row}>
          <span className={sharedStyles.detailLabel}>Slot</span>
          <span className={sharedStyles.detailValue}>
            {waveIsConfirmed
              ? `${formatWaveDate(initialBooking.waveDate)}, ${initialBooking.waveStartTime.slice(0, 5)}`
              : "To be confirmed"}
          </span>
        </div>
        <div className={styles.row}>
          <span className={sharedStyles.detailLabel}>Players</span>
          <span className={sharedStyles.detailValue}>{initialBooking.headcount}</span>
        </div>
        <div className={`${styles.row} ${sharedStyles.detailRowTotal}`}>
          <span className={sharedStyles.detailLabel}>Amount paid</span>
          <span className={sharedStyles.detailValue}>{formatMoney(initialBooking.amountPaidCents, initialBooking.currency)}</span>
        </div>
      </div>

      <p className={styles.body}>
        Check your email for a receipt and a link to manage or reschedule your booking. {RESCHEDULE_NOTICE}
      </p>

      <div className={styles.actions}>
        <Link href="/" className={sharedStyles.textLink}>
          Back to home →
        </Link>
      </div>
    </div>
  );
}
