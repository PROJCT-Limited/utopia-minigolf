"use client";

import { useMemo, useState } from "react";
import { groupByWeek, groupByMonth, type WaveView } from "@/lib/booking/waves";
import { computeBookingTotalCents, PRICE_PER_PERSON_CENTS } from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, RESCHEDULE_NOTICE } from "@/lib/booking/copy";
import { createBookingWithPaymentIntent, type PairingInput } from "@/lib/booking/createBooking";
import { formatWaveDate, formatWeekLabel, formatMonthLabel } from "../utils/formatWave";
import { PaymentStep } from "./PaymentStep";
import styles from "./book.module.css";

type PartyType = "solo" | "pair" | "group";

const PARTY_OPTIONS: { type: PartyType; label: string; desc: string; defaultHeadcount: number }[] = [
  { type: "solo", label: "Solo", desc: "Just you — we'll pair you with a team on the day.", defaultHeadcount: 1 },
  { type: "pair", label: "Pair", desc: "You and one other player.", defaultHeadcount: 2 },
  { type: "group", label: "Group", desc: "3–4 players, one booking.", defaultHeadcount: 3 },
];

const INTEREST_TAGS = ["Nightlife", "Sports", "Art & design", "Food & drink", "Music", "Travel", "Tech", "Outdoors"];
const AGE_BANDS = ["18–24", "25–34", "35–44", "45+"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

export function BookingWizard({ waves }: { waves: WaveView[] }) {
  const [step, setStep] = useState(1);
  const [partyType, setPartyType] = useState<PartyType | null>(null);
  const [headcount, setHeadcount] = useState(1);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [overEighteen, setOverEighteen] = useState(false);
  const [pairOptIn, setPairOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ bookingId: string; clientSecret: string } | null>(null);

  const weekGroups = useMemo(() => groupByWeek(waves), [waves]);
  const monthGroups = useMemo(() => groupByMonth(waves), [waves]);
  const groups = viewMode === "week" ? weekGroups : monthGroups;
  const selectedWave = waves.find((w) => w.id === selectedWaveId) ?? null;

  function selectPartyType(type: PartyType, defaultHeadcount: number) {
    setPartyType(type);
    setHeadcount(defaultHeadcount);
  }

  function toggleInterest(tag: string) {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const step1Valid = partyType !== null;
  const step2Valid = selectedWaveId !== null;
  const step3Valid =
    leadName.trim().length > 0 &&
    EMAIL_RE.test(leadEmail.trim()) &&
    (partyType !== "group" || (headcount >= 3 && headcount <= 4));

  async function handlePay() {
    if (!partyType || !selectedWaveId) return;
    setSubmitting(true);
    setError(null);

    const pairing: PairingInput | null =
      partyType !== "group"
        ? { ageBand: ageBand || null, interests, bio: bio.trim() || null, overEighteen, pairOptIn }
        : null;

    const result = await createBookingWithPaymentIntent({
      waveId: selectedWaveId,
      partyType,
      headcount,
      leadName,
      leadEmail,
      pairing,
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
              <h3>How are you coming?</h3>
            </div>
            <div className={styles.partyGrid}>
              {PARTY_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  className={`${styles.partyOption} ${partyType === opt.type ? styles.on : ""}`}
                  onClick={() => selectPartyType(opt.type, opt.defaultHeadcount)}
                >
                  <h4>{opt.label}</h4>
                  <p>{opt.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 2 of 4</span>
              <h3>Pick a wave</h3>
            </div>
            <p className="notice" style={{ marginBottom: 16 }}>
              {DATE_TBC_NOTICE}
            </p>
            <div className={styles.viewToggle}>
              <button type="button" className={viewMode === "week" ? styles.on : ""} onClick={() => setViewMode("week")}>
                Week
              </button>
              <button type="button" className={viewMode === "month" ? styles.on : ""} onClick={() => setViewMode("month")}>
                Month
              </button>
            </div>
            <div className={styles.waveGroups}>
              {groups.length === 0 && <p className="hint">No waves available yet — check back soon.</p>}
              {groups.map((g) => (
                <div key={g.key} className={styles.waveGroup}>
                  <h4>{viewMode === "week" ? formatWeekLabel(g.key) : formatMonthLabel(g.key)}</h4>
                  <div className={styles.waveList}>
                    {g.waves.map((w) => (
                      <div key={w.id} className={styles.waveRow}>
                        <span className={styles.waveDate}>{formatWaveDate(w.date)}</span>
                        <button
                          type="button"
                          className={`bwave ${selectedWaveId === w.id ? "on" : ""}`}
                          disabled={w.isFull}
                          onClick={() => setSelectedWaveId(w.id)}
                          style={{ flex: 1 }}
                        >
                          <span className={`dot ${w.isFull ? "out" : w.isLowAvailability ? "low" : ""}`} />
                          <div>
                            <div className="tm">{w.timeLabel}</div>
                          </div>
                          <span className={`st ${w.isLowAvailability ? "low" : ""}`}>
                            {w.isFull ? "Full" : `${w.spotsLeft} spot${w.spotsLeft === 1 ? "" : "s"} left`}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 3 of 4</span>
              <h3>Your details</h3>
            </div>

            <div className={styles.field}>
              <label htmlFor="leadName">{partyType === "group" ? "Lead booker name" : "Your name"}</label>
              <input id="leadName" type="text" value={leadName} onChange={(e) => setLeadName(e.target.value)} autoComplete="name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="leadEmail">Email</label>
              <input id="leadEmail" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} autoComplete="email" />
            </div>

            {partyType === "group" && (
              <div className={styles.field}>
                <label>Party size</label>
                <div className="stepper">
                  <button type="button" onClick={() => setHeadcount((n) => Math.max(3, n - 1))} disabled={headcount <= 3} aria-label="Fewer players">
                    −
                  </button>
                  <span className="n">{headcount}</span>
                  <button type="button" onClick={() => setHeadcount((n) => Math.min(4, n + 1))} disabled={headcount >= 4} aria-label="More players">
                    +
                  </button>
                </div>
              </div>
            )}

            {partyType !== "group" && (
              <>
                <div className={styles.stepLabel} style={{ marginTop: 8 }}>
                  <span className="lbl">About you (optional)</span>
                  <p className="hint" style={{ marginTop: 6 }}>
                    Used by our team to pair you well on the day, never shown publicly or to other guests.
                  </p>
                </div>

                <div className={styles.field}>
                  <label htmlFor="ageBand">Age band</label>
                  <select id="ageBand" value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
                    <option value="">Prefer not to say</option>
                    {AGE_BANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Interests</label>
                  <div className={styles.chipRow}>
                    {INTEREST_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`${styles.chip} ${interests.includes(tag) ? styles.on : ""}`}
                        onClick={() => toggleInterest(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="bio">Short bio</label>
                  <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={overEighteen}
                    onChange={(e) => {
                      setOverEighteen(e.target.checked);
                      if (!e.target.checked) setPairOptIn(false);
                    }}
                  />
                  <span>I confirm I&rsquo;m 18 years of age or over.</span>
                </label>

                <label className={`${styles.toggleRow} ${!overEighteen ? styles.disabled : ""}`}>
                  <div>
                    <strong>Pair me up</strong>
                    <p>Opt in to be paired with another solo guest or pair on the day. Requires confirming you&rsquo;re 18+.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pairOptIn}
                    disabled={!overEighteen}
                    onChange={(e) => setPairOptIn(e.target.checked)}
                  />
                </label>
              </>
            )}
          </>
        )}

        {step === 4 && !payment && (
          <>
            <div className={styles.stepLabel}>
              <span className="lbl">Step 4 of 4</span>
              <h3>Review &amp; pay</h3>
            </div>
            <p className="notice" style={{ marginBottom: 16 }}>
              {DATE_TBC_NOTICE} {RESCHEDULE_NOTICE}
            </p>
            <div className={styles.summaryRow}>
              <span>Party</span>
              <span>
                {partyType} · {headcount} {headcount === 1 ? "player" : "players"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Wave</span>
              <span>{selectedWave ? `${formatWaveDate(selectedWave.date)} · ${selectedWave.timeLabel}` : "—"}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Price</span>
              <span>
                {formatMoney(PRICE_PER_PERSON_CENTS)} × {headcount}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryTotal}>Total</span>
              <span className={styles.summaryTotal}>{formatMoney(computeBookingTotalCents(headcount))}</span>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={handlePay} disabled={submitting}>
              {submitting ? "Starting payment…" : "Continue to payment"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}

        {step === 4 && payment && (
          <PaymentStep
            bookingId={payment.bookingId}
            clientSecret={payment.clientSecret}
            amountLabel={formatMoney(computeBookingTotalCents(headcount))}
          />
        )}

        {!(step === 4 && payment) && (
          <div className={styles.footerNav}>
            <button type="button" className="btn btn-outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
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
