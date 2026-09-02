"use client";

import { useState } from "react";
import type { WaveView } from "@/lib/booking/waves";
import { TICKET_PRICE_PER_PERSON_CENTS, TICKET_TYPE_LABELS, type TicketType } from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, PUBLIC_SESSION_EXPLAINER } from "@/lib/booking/copy";
import { createSessionWithPaymentIntent } from "@/lib/sessions/createSession";
import { formatWaveDate } from "../utils/formatWave";
import sharedStyles from "../components/found/shared.module.css";
import confirmationStyles from "../confirmation.module.css";
import { WavePicker } from "./WavePicker";
import { TicketTypeStep } from "./TicketTypeStep";
import { PaymentStep } from "./PaymentStep";
import { StepProgress } from "./StepProgress";
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

  const recap: string[] = [];
  if (step > 1 && ticketType) recap.push(TICKET_TYPE_LABELS[ticketType]);
  if (step > 2 && selectedWave) recap.push(`${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}`);

  const continueHint =
    step === 1 && !step1Valid
      ? "Select a ticket to continue"
      : step === 2 && !step2Valid
        ? "Pick a slot to continue"
        : step === 3 && !step3Valid
          ? "Add your name and email to continue"
          : null;

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
    <>
      <StepProgress current={step} recap={recap} />

      {step === 1 && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Pick your pace</h2>
            <p className={styles.stepIntro}>Whatever you pick applies to everyone who joins your session.</p>
            <div className={styles.stepBody}>
              <TicketTypeStep selected={ticketType} onSelect={setTicketType} />
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Pick a slot</h2>
            <div className={styles.stepBody}>
              <WavePicker
                waves={waves}
                selectedWaveId={selectedWaveId}
                onSelect={setSelectedWaveId}
                takenWaveIds={takenWaveIds}
              />
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Your details</h2>
            <p className={styles.stepIntro}>You&rsquo;re the host — you&rsquo;ll get a link to share right after you pay.</p>
            <div className={styles.stepBody}>
              <div className={styles.field}>
                <label htmlFor="hostName">Your name</label>
                <input id="hostName" type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} autoComplete="name" />
              </div>
              <div className={styles.field}>
                <label htmlFor="hostEmail">Email</label>
                <input id="hostEmail" type="email" value={hostEmail} onChange={(e) => setHostEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 4 && !payment && ticketType && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Review &amp; pay</h2>
            <p className={styles.notice} style={{ marginTop: 20 }}>
              {selectedWave?.status === "provisional" && `${DATE_TBC_NOTICE} `}
              {PUBLIC_SESSION_EXPLAINER}
            </p>
            <div className={styles.stepBody}>
              <div className={confirmationStyles.box}>
                <div className={confirmationStyles.row}>
                  <span className={sharedStyles.detailLabel}>Ticket</span>
                  <span className={sharedStyles.detailValue}>{TICKET_TYPE_LABELS[ticketType]}</span>
                </div>
                <div className={confirmationStyles.row}>
                  <span className={sharedStyles.detailLabel}>Slot</span>
                  <span className={sharedStyles.detailValue}>
                    {selectedWave ? `${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}` : "—"}
                  </span>
                </div>
                <div className={`${confirmationStyles.row} ${sharedStyles.detailRowTotal}`}>
                  <span className={sharedStyles.detailLabel}>Your place</span>
                  <span className={sharedStyles.detailValue}>{formatMoney(TICKET_PRICE_PER_PERSON_CENTS[ticketType])}</span>
                </div>
              </div>

              <button type="button" className={sharedStyles.pillBtn} style={{ width: "100%", marginTop: 24 }} onClick={handlePay} disabled={submitting}>
                {submitting ? "Starting payment…" : "Continue to payment →"}
              </button>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          </div>
        </section>
      )}

      {step === 4 && payment && ticketType && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Pay</h2>
            <div className={styles.stepBody}>
              <PaymentStep
                bookingId={payment.participantId}
                clientSecret={payment.clientSecret}
                amountLabel={formatMoney(TICKET_PRICE_PER_PERSON_CENTS[ticketType])}
                returnPath={`/session/${payment.shareToken}?created=1&p=${payment.participantId}`}
              />
            </div>
          </div>
        </section>
      )}

      {!(step === 4 && payment) && (
        <div className={styles.footerNav}>
          <div className={styles.footerNavInner}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => (step === 1 ? onBack() : setStep((s) => Math.max(1, s - 1)))}
            >
              ← Back
            </button>
            {step < 4 && (
              <div className={styles.continueWrap}>
                <button
                  type="button"
                  className={styles.continueBtn}
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid) || (step === 3 && !step3Valid)}
                >
                  Continue →
                </button>
                {continueHint && <p className={styles.continueHint}>{continueHint}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
