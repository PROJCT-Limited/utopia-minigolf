"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./EarlyBirdCountdown.module.css";

/**
 * The strip across the top of the page: "RESERVE NOW — EARLY BIRD PRICES END
 * IN 1 DAY 10 HRS 23 MINS 13 SECS". It replaced the struck-through list price
 * on the tier rows — a crossed-out number reads as a permanent sale tag,
 * where a clock that's visibly running says the same thing with a deadline
 * attached.
 *
 * Whether the offer is live is still the server's call: callers render this
 * only inside an `isEarlyBirdActive()` check and hand down the deadline. The
 * client clock is trusted for one thing only — animating the digits between
 * server renders — and never for what anyone is charged.
 *
 * `serverNowMs` exists so the first paint is deterministic. Seeding state
 * from the browser's clock would make the hydrated markup disagree with the
 * server-rendered HTML; seeding it from a number the server put in the props
 * can't. The effect then re-anchors to the real clock on mount, which also
 * corrects for the homepage's 60s ISR window.
 */
export function EarlyBirdCountdown({
  endsAtMs,
  serverNowMs,
  deadlineLabel,
  withCta = true,
}: {
  endsAtMs: number;
  serverNowMs: number;
  /**
   * The deadline on the venue's clock ("23 Sept, 23:59 HKT"), formatted on
   * the server by formatDeadlineInVenueTime(). Passed in rather than worked
   * out here so the strip states Hong Kong's midnight to every guest, wherever
   * they're reading it — a browser asked to format this would answer in its
   * own timezone, and would disagree with the server-rendered HTML besides.
   */
  deadlineLabel: string;
  /** Off on /book itself, where a "Reserve now" link would point at the page
      the guest is already standing on. */
  withCta?: boolean;
}) {
  const [remainingMs, setRemainingMs] = useState(() => endsAtMs - serverNowMs);

  useEffect(() => {
    const tick = () => setRemainingMs(endsAtMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAtMs]);

  // The deadline can pass while the page is open — a stale "ends in 0 secs"
  // strip is worse than none, and the server will stop rendering this on the
  // next load anyway.
  if (remainingMs <= 0) return null;

  const parts = splitRemaining(remainingMs);

  return (
    <div className={styles.strip}>
      <div className={styles.inner}>
        {withCta && (
          <Link href="/book" className={styles.cta}>
            Reserve now
          </Link>
        )}
        <span className={styles.line}>
          {withCta && (
            <span className={styles.dash} aria-hidden>
              &mdash;
            </span>
          )}
          Early bird prices end in{" "}
          <span className={styles.clock}>
            {parts.map((part) => (
              <span key={part.unit} className={styles.part}>
                <span className={styles.value}>{part.value}</span>
                <span className={styles.unit}>{part.unit}</span>
              </span>
            ))}
          </span>
          <span className={styles.deadline}> &middot; {deadlineLabel}</span>
        </span>
      </div>
    </div>
  );
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Days are dropped once there are none left, so the last day reads
 * "10 HRS 23 MINS 13 SECS" rather than leading with a dead "0 DAYS".
 * Everything below that stays put: dropping hours too would make the strip
 * change width on the hour, and the eye reads a jumping line as a glitch.
 */
function splitRemaining(ms: number): { value: string; unit: string }[] {
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const seconds = Math.floor((ms % MINUTE) / SECOND);

  const parts = [
    { value: String(hours), unit: hours === 1 ? "hr" : "hrs" },
    { value: String(minutes), unit: minutes === 1 ? "min" : "mins" },
    { value: String(seconds), unit: seconds === 1 ? "sec" : "secs" },
  ];

  if (days > 0) {
    parts.unshift({ value: String(days), unit: days === 1 ? "day" : "days" });
  }

  return parts;
}
