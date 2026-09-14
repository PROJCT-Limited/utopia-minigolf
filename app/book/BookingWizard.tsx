"use client";

import { useState } from "react";
import { hasRoomFor, type WaveView } from "@/lib/booking/waves";
import {
  computeDisplayTotalCents,
  TICKET_TYPE_LABELS,
  MIN_HEADCOUNT,
  MAX_HEADCOUNT,
  type TicketType,
} from "@/lib/booking/pricing";
import { EARLY_BIRD_NOTICE, RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { createBookingWithPaymentIntent } from "@/lib/booking/createBooking";
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

export function BookingWizard({
  waves,
  earlyBird,
}: {
  waves: WaveView[];
  // Resolved on the server in page.tsx. Display only — createBooking prices
  // the charge again from the server's own clock.
  earlyBird: boolean;
}) {
  const [step, setStep] = useState(1);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [headcount, setHeadcount] = useState(1);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  /**
   * Step 2 asks two things, and asking them both at once buried the first:
   * party size sat above a full calendar, so people scrolled past it and then
   * met "that start time doesn't fit your group". The times stay closed until
   * the group is settled, because how many spaces a start time needs is the
   * thing that decides which ones can be offered at all.
   */
  const [partySettled, setPartySettled] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ bookingId: string; clientSecret: string } | null>(null);

  const selectedWave = waves.find((w) => w.id === selectedWaveId) ?? null;

  // Capacity is counted in people, so party size decides what's bookable:
  // growing the group can outgrow the start time already chosen, which then
  // has to be given up rather than silently failing at payment.
  function changeHeadcount(next: number) {
    setHeadcount(next);
    const stillSelected = waves.find((w) => w.id === selectedWaveId);
    if (stillSelected && !hasRoomFor(stillSelected, next)) {
      setSelectedWaveId(null);
    }
  }

  const step1Valid = ticketType !== null;
  const step2Valid = partySettled
    ? selectedWave !== null && hasRoomFor(selectedWave, headcount)
    : true; // any group of 1–5 is a valid answer; the button just opens the times
  const step3Valid = leadName.trim().length > 0 && EMAIL_RE.test(leadEmail.trim());

  const recap: string[] = [];
  if (step > 1 && ticketType) recap.push(TICKET_TYPE_LABELS[ticketType]);
  if (step > 2 && selectedWave) recap.push(`${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}`);

  const continueHint =
    step === 1 && !step1Valid
      ? "Select a ticket to continue"
      : step === 2 && !partySettled
        ? null
        : step === 2 && !step2Valid
          ? "Pick a start time that fits your group to continue"
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
            <p className={styles.includedList}>
              Come on your own or bring the whole group. Five stations, and the automated scoring for your
              convenience
            </p>
            {earlyBird && (
              <p className={styles.earlyBirdNote}>
                <span className={styles.earlyBirdTag}>Early bird</span>
                {EARLY_BIRD_NOTICE}
              </p>
            )}
            <div className={styles.stepBody}>
              <TicketTypeStep selected={ticketType} onSelect={setTicketType} earlyBird={earlyBird} />
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>{partySettled ? "Pick a slot" : "Who's playing?"}</h2>
            <div className={styles.stepBody}>
              <div className={styles.field}>
                <label>Players in your group</label>
                <div className={sharedStyles.stepperRow}>
                  <button
                    type="button"
                    className={sharedStyles.stepperBtn}
                    onClick={() => changeHeadcount(Math.max(MIN_HEADCOUNT, headcount - 1))}
                    disabled={headcount <= MIN_HEADCOUNT}
                    aria-label="Fewer players"
                  >
                    −
                  </button>
                  <span className={sharedStyles.stepperCount}>{headcount}</span>
                  <button
                    type="button"
                    className={sharedStyles.stepperBtn}
                    onClick={() => changeHeadcount(Math.min(MAX_HEADCOUNT, headcount + 1))}
                    disabled={headcount >= MAX_HEADCOUNT}
                    aria-label="More players"
                  >
                    +
                  </button>
                </div>
              </div>
              {partySettled && (
                <div className={styles.slotPicker}>
                  <WavePicker
                    waves={waves}
                    headcount={headcount}
                    selectedWaveId={selectedWaveId}
                    onSelect={setSelectedWaveId}
                  />
                </div>
              )}
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
            </div>
          </div>
        </section>
      )}

      {step === 4 && !payment && ticketType && (
        <section className={styles.stepSection}>
          <div className={styles.stepInner}>
            <h2 className={styles.stepHeading}>Review &amp; pay</h2>
            <p className={styles.notice} style={{ marginTop: 20 }}>
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
                  <span className={sharedStyles.detailLabel}>
                    Total{earlyBird ? " (early bird)" : ""}
                  </span>
                  <span className={sharedStyles.detailValue}>{formatMoney(computeDisplayTotalCents(ticketType, headcount, earlyBird))}</span>
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
                amountLabel={formatMoney(computeDisplayTotalCents(ticketType, headcount, earlyBird))}
              />
            </div>
          </div>
        </section>
      )}

      {!(step === 4 && payment) && (
        <div className={styles.footerNav}>
          <div className={styles.footerNavInner}>
            {/* Step 1 is now the first thing on the page — there is no
                booking-mode picker behind it to go back to. */}
            {step > 1 ? (
              <button type="button" className={styles.backLink} onClick={() => setStep((s) => s - 1)}>
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < 4 && (
              <div className={styles.continueWrap}>
                <button
                  type="button"
                  className={styles.continueBtn}
                  onClick={() => {
                    // Same button, two jobs on step 2: settle the group, then
                    // move on. One primary action beats a second button
                    // competing with it halfway down the step.
                    if (step === 2 && !partySettled) {
                      setPartySettled(true);
                      return;
                    }
                    setStep((s) => Math.min(4, s + 1));
                  }}
                  disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid) || (step === 3 && !step3Valid)}
                >
                  {step === 2 && !partySettled ? "See the times →" : "Continue →"}
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
