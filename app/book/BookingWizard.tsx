"use client";

import { useState } from "react";
import type { WaveView } from "@/lib/booking/waves";
import {
  computeBookingTotalCents,
  TICKET_TYPE_LABELS,
  MIN_PRIVATE_GROUP_HEADCOUNT,
  MAX_PRIVATE_GROUP_HEADCOUNT,
  type TicketType,
} from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { createBookingWithPaymentIntent } from "@/lib/booking/createBooking";
import { formatWaveDate } from "../utils/formatWave";
import sharedStyles from "../components/found/shared.module.css";
import confirmationStyles from "../confirmation.module.css";
import { WavePicker } from "./WavePicker";
import { TicketTypeStep } from "./TicketTypeStep";
import { PaymentStep } from "./PaymentStep";
import { PublicSessionWizard } from "./PublicSessionWizard";
import { StepProgress } from "./StepProgress";
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
    <section className={styles.stepSection}>
      <div className={styles.stepInner}>
        <h2 className={styles.stepHeading}>How are you booking?</h2>
        <div className={styles.stepBody}>
          <div className={styles.selectRows}>
            <button type="button" className={styles.selectRow} onClick={() => onSelect("private")}>
              <div className={styles.selectRowHead}>
                <span className={styles.radioDot} />
                <span className={styles.selectRowTitle}>Private group</span>
              </div>
              <p className={styles.selectRowBody}>Reserve a slot for your own party. You pay for everyone in one go.</p>
            </button>
            <button type="button" className={styles.selectRow} onClick={() => onSelect("public")}>
              <div className={styles.selectRowHead}>
                <span className={styles.radioDot} />
                <span className={styles.selectRowTitle}>Public session</span>
              </div>
              <p className={styles.selectRowBody}>
                Start a session and share the link. Everyone who joins pays for their own place — 2 to 5 players.
              </p>
            </button>
          </div>
        </div>
      </div>
    </section>
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
    <>
      <StepProgress current={step} recap={recap} />

      {step === 1 && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Pick your pace</h2>
            <div className={styles.includedList}>
              WHAT&rsquo;S INCLUDED
              <br />/ AUTOMATIC SCORING
              <br />/ LIVE LEADERBOARD
              <br />/ DRINKS
            </div>
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
              <WavePicker waves={waves} selectedWaveId={selectedWaveId} onSelect={setSelectedWaveId} />
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Your details</h2>
            <div className={styles.stepBody}>
              <div className={styles.field}>
                <label htmlFor="leadName">{headcount === 1 ? "Your name" : "Lead booker name"}</label>
                <input id="leadName" type="text" value={leadName} onChange={(e) => setLeadName(e.target.value)} autoComplete="name" />
              </div>
              <div className={styles.field}>
                <label htmlFor="leadEmail">Email</label>
                <input id="leadEmail" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className={styles.field}>
                <label>Players</label>
                <div className={sharedStyles.stepperRow}>
                  <button
                    type="button"
                    className={sharedStyles.stepperBtn}
                    onClick={() => setHeadcount((n) => Math.max(MIN_PRIVATE_GROUP_HEADCOUNT, n - 1))}
                    disabled={headcount <= MIN_PRIVATE_GROUP_HEADCOUNT}
                    aria-label="Fewer players"
                  >
                    −
                  </button>
                  <span className={sharedStyles.stepperCount}>{headcount}</span>
                  <button
                    type="button"
                    className={sharedStyles.stepperBtn}
                    onClick={() => setHeadcount((n) => Math.min(MAX_PRIVATE_GROUP_HEADCOUNT, n + 1))}
                    disabled={headcount >= MAX_PRIVATE_GROUP_HEADCOUNT}
                    aria-label="More players"
                  >
                    +
                  </button>
                </div>
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
              {RESCHEDULE_NOTICE}
            </p>
            <div className={styles.stepBody}>
              <div className={confirmationStyles.box}>
                <div className={confirmationStyles.row}>
                  <span className={sharedStyles.detailLabel}>Ticket</span>
                  <span className={sharedStyles.detailValue}>{TICKET_TYPE_LABELS[ticketType]}</span>
                </div>
                <div className={confirmationStyles.row}>
                  <span className={sharedStyles.detailLabel}>Party</span>
                  <span className={sharedStyles.detailValue}>
                    {headcount} {headcount === 1 ? "player" : "players"}
                  </span>
                </div>
                <div className={confirmationStyles.row}>
                  <span className={sharedStyles.detailLabel}>Slot</span>
                  <span className={sharedStyles.detailValue}>
                    {selectedWave ? `${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}` : "—"}
                  </span>
                </div>
                <div className={`${confirmationStyles.row} ${sharedStyles.detailRowTotal}`}>
                  <span className={sharedStyles.detailLabel}>Total</span>
                  <span className={sharedStyles.detailValue}>{formatMoney(computeBookingTotalCents(ticketType, headcount))}</span>
                </div>
              </div>

              <button type="button" className={sharedStyles.pillBtn} style={{ width: "100%", marginTop: 24 }} onClick={handlePay} disabled={submitting}>
                {submitting ? "Starting payment…" : "Continue to payment →"}
              </button>
              <p className={styles.hint} style={{ marginTop: 12 }}>
                Full payment is taken now to hold your place. Powered by Stripe.
              </p>
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
                bookingId={payment.bookingId}
                clientSecret={payment.clientSecret}
                amountLabel={formatMoney(computeBookingTotalCents(ticketType, headcount))}
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
