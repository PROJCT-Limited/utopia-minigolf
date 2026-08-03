"use client";

import { useState } from "react";
import type { WaveView } from "@/lib/booking/waves";
import { PRICE_PER_PERSON_CENTS } from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, PUBLIC_SESSION_EXPLAINER } from "@/lib/booking/copy";
import { createSessionWithPaymentIntent } from "@/lib/sessions/createSession";
import { formatWaveDate } from "../utils/formatWave";
import { WavePicker } from "./WavePicker";
import { PaymentStep } from "./PaymentStep";
import styles from "./book.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

export function PublicSessionWizard({ waves, onBack }: { waves: WaveView[]; onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [hostName, setHostName] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ participantId: string; clientSecret: string; shareToken: string } | null>(
    null
  );

  const selectedWave = waves.find((w) => w.id === selectedWaveId) ?? null;

  const step1Valid = selectedWaveId !== null;
  const step2Valid = hostName.trim().length > 0 && EMAIL_RE.test(hostEmail.trim());

  async function handlePay() {
    if (!selectedWaveId) return;
    setSubmitting(true);
    setError(null);

    const result = await createSessionWithPaymentIntent({
      waveId: selectedWaveId,
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
        {[1, 2, 3].map((n) => (
          <div key={n} className={`${styles.stepdot} ${n < step ? styles.done : n === step ? styles.on : ""}`} />
        ))}
      </div>

      <div className="bookcard">
        {step === 1 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 1 of 3</span>
              <h3>Pick a wave</h3>
            </div>
            <p className="notice" style={{ marginBottom: 16 }}>
              {DATE_TBC_NOTICE}
            </p>
            <WavePicker waves={waves} selectedWaveId={selectedWaveId} onSelect={setSelectedWaveId} />
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 2 of 3</span>
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

        {step === 3 && !payment && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 3 of 3</span>
              <h3>Review &amp; pay</h3>
            </div>
            <p className="notice" style={{ marginBottom: 16 }}>
              {DATE_TBC_NOTICE} {PUBLIC_SESSION_EXPLAINER}
            </p>
            <div className={styles.summaryRow}>
              <span>Wave</span>
              <span>{selectedWave ? `${formatWaveDate(selectedWave.date)}, ${selectedWave.timeLabel}` : "—"}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Your place</span>
              <span>{formatMoney(PRICE_PER_PERSON_CENTS)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryTotal}>Total</span>
              <span className={styles.summaryTotal}>{formatMoney(PRICE_PER_PERSON_CENTS)}</span>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={handlePay} disabled={submitting}>
              {submitting ? "Starting payment…" : "Continue to payment"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}

        {step === 3 && payment && (
          <PaymentStep
            bookingId={payment.participantId}
            clientSecret={payment.clientSecret}
            amountLabel={formatMoney(PRICE_PER_PERSON_CENTS)}
            returnPath={`/session/${payment.shareToken}?created=1`}
          />
        )}

        {!(step === 3 && payment) && (
          <div className={styles.footerNav}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => (step === 1 ? onBack() : setStep((s) => Math.max(1, s - 1)))}
            >
              Back
            </button>
            {step < 3 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
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
