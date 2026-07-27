"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WaveView } from "@/lib/booking/waves";
import type { BookingForManage } from "@/lib/booking/reschedule";
import { rescheduleBookingAction } from "@/lib/booking/rescheduleAction";
import { formatWaveDate } from "../../utils/formatWave";
import { RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import confirmationStyles from "../../confirmation.module.css";
import bookStyles from "../../book/book.module.css";

interface ManageViewProps {
  token: string;
  booking: BookingForManage;
  currentWave: WaveView | null;
  eligibleForReschedule: boolean;
  availableWaves: WaveView[];
}

export function ManageView({ token, booking, currentWave, eligibleForReschedule, availableWaves }: ManageViewProps) {
  const router = useRouter();
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleReschedule() {
    if (!selectedWaveId) return;
    setSubmitting(true);
    setError(null);
    const result = await rescheduleBookingAction(token, selectedWaveId);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (booking.status !== "paid") {
    return (
      <div className={confirmationStyles.card}>
        <h1 className={confirmationStyles.title}>This booking isn&rsquo;t confirmed yet</h1>
        <p>If you just paid, give it a moment and refresh this page.</p>
      </div>
    );
  }

  return (
    <div className={confirmationStyles.card}>
      <span className="lbl">Manage your booking</span>
      <h1 className={confirmationStyles.title}>
        {booking.partyType} · {booking.headcount} {booking.headcount === 1 ? "player" : "players"}
      </h1>

      <div className={confirmationStyles.row}>
        <span>Booked for</span>
        <span>
          {currentWave ? `${formatWaveDate(currentWave.date)} · ${currentWave.timeLabel}` : "To be confirmed"}
        </span>
      </div>
      <div className={confirmationStyles.row}>
        <span>Lead booker</span>
        <span>
          {booking.leadName} · {booking.leadEmail}
        </span>
      </div>

      {success ? (
        <p className="notice" style={{ marginTop: 20 }}>
          Rescheduled. Check your email for the updated confirmation.
        </p>
      ) : booking.rescheduleUsed ? (
        <p style={{ marginTop: 20, fontSize: 14, color: "var(--ink-2)" }}>
          You&rsquo;ve already used your one self-serve reschedule for this booking. Reply to your confirmation email
          if you need help.
        </p>
      ) : !eligibleForReschedule ? (
        <p style={{ marginTop: 20, fontSize: 14, color: "var(--ink-2)" }}>
          It&rsquo;s too close to your confirmed date to reschedule online — reply to your confirmation email and
          we&rsquo;ll help directly.
        </p>
      ) : (
        <>
          <p style={{ marginTop: 20, fontSize: 13.5, color: "var(--ink-2)" }}>{RESCHEDULE_NOTICE}</p>
          <div className={bookStyles.waveGroups} style={{ marginTop: 16, maxHeight: 320 }}>
            <div className={bookStyles.waveList}>
              {availableWaves.length === 0 && <p className="hint">No other waves are available to move to right now.</p>}
              {availableWaves.map((w) => (
                <div key={w.id} className={bookStyles.waveRow}>
                  <span className={bookStyles.waveDate}>{formatWaveDate(w.date)}</span>
                  <button
                    type="button"
                    className={`bwave ${selectedWaveId === w.id ? "on" : ""}`}
                    onClick={() => setSelectedWaveId(w.id)}
                    style={{ flex: 1 }}
                  >
                    <span className={`dot ${w.isLowAvailability ? "low" : ""}`} />
                    <div>
                      <div className="tm">{w.timeLabel}</div>
                    </div>
                    <span className={`st ${w.isLowAvailability ? "low" : ""}`}>
                      {w.spotsLeft} spot{w.spotsLeft === 1 ? "" : "s"} left
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 18 }}
            onClick={handleReschedule}
            disabled={!selectedWaveId || submitting}
          >
            {submitting ? "Rescheduling…" : "Confirm reschedule"}
          </button>
          {error && <p className={bookStyles.error}>{error}</p>}
        </>
      )}
    </div>
  );
}
