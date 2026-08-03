"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DATE_TBC_NOTICE, RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import styles from "../../confirmation.module.css";

interface BookingForView {
  leadName: string;
  partyType: "solo" | "pair" | "group";
  headcount: number;
  amountPaidCents: number;
  currency: string;
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
        <p className={styles.pending}>Confirming your payment… this only takes a moment.</p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>This booking didn&rsquo;t go through</h1>
        <p>Nothing was charged. Please try again.</p>
        <div className={styles.actions}>
          <Link href="/book" className="btn btn-primary">
            Back to booking
          </Link>
        </div>
      </div>
    );
  }

  const firstName = initialBooking.leadName.trim().split(/\s+/)[0] || initialBooking.leadName;

  return (
    <div className={styles.card}>
      <span className="lbl">Booking confirmed</span>
      <h1 className={styles.title}>You&rsquo;re in, {firstName}.</h1>

      <div className={styles.row}>
        <span>Party</span>
        <span>
          {initialBooking.partyType}, {initialBooking.headcount} {initialBooking.headcount === 1 ? "player" : "players"}
        </span>
      </div>
      <div className={styles.row}>
        <span>Amount paid</span>
        <span>{formatMoney(initialBooking.amountPaidCents, initialBooking.currency)}</span>
      </div>

      <p className="notice" style={{ marginTop: 20 }}>
        {DATE_TBC_NOTICE}
      </p>
      <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
        Check your email for a receipt and a link to manage or reschedule your booking. {RESCHEDULE_NOTICE}
      </p>

      <div className={styles.actions}>
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
