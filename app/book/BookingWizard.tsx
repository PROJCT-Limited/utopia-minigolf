"use client";

import { useState } from "react";
import type { WaveView } from "@/lib/booking/waves";
import {
  computeBookingTotalCents,
  TICKET_PRICE_PER_PERSON_CENTS,
  TICKET_TYPE_LABELS,
  MIN_PRIVATE_GROUP_HEADCOUNT,
  MAX_PRIVATE_GROUP_HEADCOUNT,
  type TicketType,
} from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { createBookingWithPaymentIntent } from "@/lib/booking/createBooking";
import { formatWaveDate } from "../utils/formatWave";
import { WavePicker } from "./WavePicker";
import { TicketTypeStep } from "./TicketTypeStep";
import { PaymentStep } from "./PaymentStep";
import { PublicSessionWizard } from "./PublicSessionWizard";
import styles from "./book.module.css";

type BookingMode = "private" | "public";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

export function BookingWizard({ waves, takenWaveIds }: { waves: WaveView[]; takenWaveIds: string[] }) {
  const [mode, setMode] = useState<BookingMode | null>(null);

  if (mode === null) {
    return <BookingModePicker onSelect={setMode} />;
  }

  if (mode === "public") {
    return <PublicSessionWizard waves={waves} takenWaveIds={takenWaveIds} onBack={() => setMode(null)} />;
  }

  return <PrivateGroupWizard waves={waves} onBack={() => setMode(null)} />;
}

function BookingModePicker({ onSelect }: { onSelect: (mode: BookingMode) => void }) {
  return (
    <div className={styles.panel}>
      <div className="bookcard">
        <div className={styles.stepLabel}>
          <span className="lbl">Reserve your place</span>
          <h3>How are you booking?</h3>
        </div>
        <div className={`${styles.partyGrid} ${styles.modeGrid}`}>
          <button type="button" className={styles.partyOption} onClick={() => onSelect("private")}>
            <h4>Private group</h4>
            <p>Reserve a slot for your own party. You pay for everyone in one go.</p>
          </button>
          <button type="button" className={styles.partyOption} onClick={() => onSelect("public")}>
            <h4>Public session</h4>
            <p>Start a session and share the link. Everyone who joins pays for their own place — 2 to 5 players.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivateGroupWizard({ waves, onBack }: { waves: WaveView[]; onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [headcount, setHeadcount] = useState(1);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ bookingId: string; clientSecret: string } | null>(null);

  const selectedWave = waves.find((w) => w.id === selectedWaveId) ?? null;

  const step1Valid = ticketType !== null;
  const step2Valid = selectedWaveId !== null;
  const step3Valid = leadName.trim().length > 0 && EMAIL_RE.test(leadEmail.trim());

  async function handlePay() {
    if (!selectedWaveId || !ticketType) return;
    setSubmitting(true);
    setError(null);

    const result = await createBookingWithPaymentIntent({
      waveId: selectedWaveId,
      ticketType,
      headcount,
      leadName,
      leadEmail,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPayment({ bookingId: result.bookingId, clientSecret: result.clientSecret });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.steps}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`${styles.stepdot} ${n < step ? styles.done : n === step ? styles.on : ""}`} />
        ))}
      </div>

      <div className="bookcard">
        {step === 1 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 1 of 4</span>
              <h3>Choose your ticket</h3>
            </div>
            <TicketTypeStep selected={ticketType} onSelect={setTicketType} />
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 2 of 4</span>
              <h3>Pick a slot</h3>
            </div>
            <WavePicker waves={waves} selectedWaveId={selectedWaveId} onSelect={setSelectedWaveId} />
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 3 of 4</span>
              <h3>Your details</h3>
            </div>

            <div className={styles.field}>
              <label htmlFor="leadName">{headcount === 1 ? "Your name" : "Lead booker name"}</label>
              <input id="leadName" type="text" value={leadName} onChange={(e) => setLeadName(e.target.value)} autoComplete="name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="leadEmail">Email</label>
              <input id="leadEmail" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className={styles.field}>
              <label>How many people</label>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setHeadcount((n) => Math.max(MIN_PRIVATE_GROUP_HEADCOUNT, n - 1))}
                  disabled={headcount <= MIN_PRIVATE_GROUP_HEADCOUNT}
                  aria-label="Fewer players"
                >
                  −
                </button>
                <span className="n">{headcount}</span>
                <button
                  type="button"
                  onClick={() => setHeadcount((n) => Math.min(MAX_PRIVATE_GROUP_HEADCOUNT, n + 1))}
                  disabled={headcount >= MAX_PRIVATE_GROUP_HEADCOUNT}
                  aria-label="More players"
                >
                  +
                </button>
              </div>
            </div>
          </>
        )}

        {step === 4 && !payment && ticketType && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 4 of 4</span>
              <h3>Review &amp; pay</h3>
            </div>
            <p className="notice" style={{ marginBottom: 16 }}>
              {selectedWave?.status === "provisional" && `${DATE_TBC_NOTICE} `}
              {RESCHEDULE_NOTICE}
            </p>
            <div className={styles.summaryRow}>
              <span>Ticket</span>
              <span>{TICKET_TYPE_LABELS[ticketType]}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Party</span>
              <span>
                {headcount} {headcount === 1 ? "player" : "players"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Slot</span>
              <span>{selectedWave ? `${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}` : "—"}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Price</span>
              <span>
                {formatMoney(TICKET_PRICE_PER_PERSON_CENTS[ticketType])} × {headcount}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryTotal}>Total</span>
              <span className={styles.summaryTotal}>{formatMoney(computeBookingTotalCents(ticketType, headcount))}</span>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={handlePay} disabled={submitting}>
              {submitting ? "Starting payment…" : "Continue to payment"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}

        {step === 4 && payment && ticketType && (
          <PaymentStep
            bookingId={payment.bookingId}
            clientSecret={payment.clientSecret}
            amountLabel={formatMoney(computeBookingTotalCents(ticketType, headcount))}
          />
        )}

        {!(step === 4 && payment) && (
          <div className={styles.footerNav}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => (step === 1 ? onBack() : setStep((s) => Math.max(1, s - 1)))}
            >
              Back
            </button>
            {step < 4 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid) || (step === 3 && !step3Valid)}
              >
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
