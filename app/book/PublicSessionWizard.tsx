"use client";

import { useState } from "react";
import type { WaveView } from "@/lib/booking/waves";
import { TICKET_PRICE_PER_PERSON_CENTS, TICKET_TYPE_LABELS, type TicketType } from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, PUBLIC_SESSION_EXPLAINER } from "@/lib/booking/copy";
import { createSessionWithPaymentIntent } from "@/lib/sessions/createSession";
import { formatWaveDate } from "../utils/formatWave";
import { WavePicker } from "./WavePicker";
import { TicketTypeStep } from "./TicketTypeStep";
import { PaymentStep } from "./PaymentStep";
import styles from "./book.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

export function PublicSessionWizard({
  waves,
  takenWaveIds,
  onBack,
}: {
  waves: WaveView[];
  takenWaveIds: string[];
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [hostName, setHostName] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ participantId: string; clientSecret: string; shareToken: string } | null>(
    null
  );

  const selectedWave = waves.find((w) => w.id === selectedWaveId) ?? null;

  const step1Valid = ticketType !== null;
  const step2Valid = selectedWaveId !== null;
  const step3Valid = hostName.trim().length > 0 && EMAIL_RE.test(hostEmail.trim());

  async function handlePay() {
    if (!selectedWaveId || !ticketType) return;
    setSubmitting(true);
    setError(null);

    const result = await createSessionWithPaymentIntent({
      waveId: selectedWaveId,
      ticketType,
      hostName,
      hostEmail,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPayment({
      participantId: result.participantId,
      clientSecret: result.clientSecret,
      shareToken: result.shareToken,
    });
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
              <p className="hint" style={{ marginTop: 8 }}>
                Whatever you pick applies to everyone who joins your session.
              </p>
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
            <WavePicker
              waves={waves}
              selectedWaveId={selectedWaveId}
              onSelect={setSelectedWaveId}
              takenWaveIds={takenWaveIds}
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 3 of 4</span>
              <h3>Your details</h3>
            </div>
            <p className="hint" style={{ marginBottom: 16 }}>
              You&rsquo;re the host — you&rsquo;ll get a link to share right after you pay.
            </p>

            <div className={styles.field}>
              <label htmlFor="hostName">Your name</label>
              <input id="hostName" type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} autoComplete="name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="hostEmail">Email</label>
              <input id="hostEmail" type="email" value={hostEmail} onChange={(e) => setHostEmail(e.target.value)} autoComplete="email" />
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
              {PUBLIC_SESSION_EXPLAINER}
            </p>
            <div className={styles.summaryRow}>
              <span>Ticket</span>
              <span>{TICKET_TYPE_LABELS[ticketType]}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Slot</span>
              <span>{selectedWave ? `${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}` : "—"}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Your place</span>
              <span>{formatMoney(TICKET_PRICE_PER_PERSON_CENTS[ticketType])}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryTotal}>Total</span>
              <span className={styles.summaryTotal}>{formatMoney(TICKET_PRICE_PER_PERSON_CENTS[ticketType])}</span>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={handlePay} disabled={submitting}>
              {submitting ? "Starting payment…" : "Continue to payment"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}

        {step === 4 && payment && ticketType && (
          <PaymentStep
            bookingId={payment.participantId}
            clientSecret={payment.clientSecret}
            amountLabel={formatMoney(TICKET_PRICE_PER_PERSON_CENTS[ticketType])}
            returnPath={`/session/${payment.shareToken}?created=1&p=${payment.participantId}`}
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
