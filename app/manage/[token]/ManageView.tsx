"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { groupByHour, type WaveView } from "@/lib/booking/waves";
import type { BookingForManage } from "@/lib/booking/reschedule";
import { rescheduleBookingAction } from "@/lib/booking/rescheduleAction";
import { formatWaveDate } from "../../utils/formatWave";
import { RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { TICKET_TYPE_LABELS } from "@/lib/booking/pricing";
import sharedStyles from "../../components/found/shared.module.css";
import { HourGroupRow } from "../../book/HourGroupRow";
import confirmationStyles from "../../confirmation.module.css";
import bookStyles from "../../book/book.module.css";

interface ManageViewProps {
  kind: "booking";
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

  const hourGroups = useMemo(() => groupByHour(availableWaves), [availableWaves]);

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
        <p className={confirmationStyles.body}>If you just paid, give it a moment and refresh this page.</p>
      </div>
    );
  }

  return (
    <div className={confirmationStyles.card}>
      <span className={confirmationStyles.kicker}>Manage your booking</span>
      <h1 className={confirmationStyles.title}>
        {booking.partyType}, {booking.headcount} {booking.headcount === 1 ? "player" : "players"}
      </h1>

      <div className={confirmationStyles.box}>
        <div className={confirmationStyles.row}>
          <span className={sharedStyles.detailLabel}>Ticket</span>
          <span className={sharedStyles.detailValue}>{TICKET_TYPE_LABELS[booking.ticketType]}</span>
        </div>
        <div className={confirmationStyles.row}>
          <span className={sharedStyles.detailLabel}>Booked for</span>
          <span className={sharedStyles.detailValue}>
            {currentWave ? `${formatWaveDate(currentWave.date)}, ${currentWave.timeLabel}` : "To be confirmed"}
          </span>
        </div>
        <div className={`${confirmationStyles.row} ${sharedStyles.detailRowTotal}`}>
          <span className={sharedStyles.detailLabel}>Lead booker</span>
          <span className={sharedStyles.detailValue}>
            {booking.leadName}, {booking.leadEmail}
          </span>
        </div>
      </div>

      {success ? (
        <p className={bookStyles.notice} style={{ marginTop: 24 }}>
          Rescheduled. Check your email for the updated confirmation.
        </p>
      ) : booking.rescheduleUsed ? (
        <p className={confirmationStyles.body}>
          You&rsquo;ve already used your one self-serve reschedule for this booking. Reply to your confirmation email
          if you need help.
        </p>
      ) : !eligibleForReschedule ? (
        <p className={confirmationStyles.body}>
          It&rsquo;s too close to your confirmed date to reschedule online — reply to your confirmation email and
          we&rsquo;ll help directly.
        </p>
      ) : (
        <>
          <h2 className={sharedStyles.h48} style={{ fontSize: 24, marginTop: 40, marginBottom: 8 }}>
            Move your booking
          </h2>
          <p className={bookStyles.notice} style={{ marginBottom: 16 }}>
            {RESCHEDULE_NOTICE}
          </p>
          <div className={bookStyles.waveGroups} style={{ maxHeight: 360 }}>
            {hourGroups.length === 0 ? (
              <p className={bookStyles.hint}>No other start times have room for your group right now.</p>
            ) : (
              <div className={bookStyles.waveList}>
                {hourGroups.map((hourGroup) => (
                  <HourGroupRow
                    key={hourGroup.key}
                    hourGroup={hourGroup}
                    /* Only start times with room for this whole group are
                       offered — capacity is people, not bookings. */
                    headcount={booking.headcount}
                    selectedWaveId={selectedWaveId}
                    onSelect={setSelectedWaveId}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={sharedStyles.pillBtn}
            style={{ width: "100%", marginTop: 18 }}
            onClick={handleReschedule}
            disabled={!selectedWaveId || submitting}
          >
            {submitting ? "Rescheduling…" : "Confirm reschedule →"}
          </button>
          {error && <p className={bookStyles.error}>{error}</p>}
        </>
      )}
    </div>
  );
}
