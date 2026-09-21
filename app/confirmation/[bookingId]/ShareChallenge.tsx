"use client";

import { useState } from "react";
import sharedStyles from "../../components/found/shared.module.css";
import styles from "../../confirmation.module.css";

/**
 * The share that goes out the moment a booking is paid.
 *
 * Framed as a challenge rather than an invitation, because "I made a booking"
 * is not worth forwarding and "think you can beat me" is. It's a bluff at
 * this point — nobody has played yet — but it's the same component the
 * post-round version will use, where the boast is a real number.
 *
 * WhatsApp gets its own button: it's where Hong Kong groups actually are, and
 * a deep link opens the app with the message already written. The native
 * share sheet covers everything else on a phone, and copy is the fallback on
 * a desktop that has neither.
 */

/** "Tue 13 Oct" — the shape a person would type in a message. */
function shareDate(waveDate: string): string {
  return new Date(`${waveDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function buildChallenge(waveDate: string, waveIsConfirmed: boolean): string {
  // A slot that's still provisional has no date worth naming, so the line
  // drops it rather than promising one.
  const when = waveIsConfirmed ? ` on ${shareDate(waveDate)}` : "";
  return `I'm playing minigolf at FOUND${when}. Think you can beat me? 189found.club`;
}

export function ShareChallenge({
  waveDate,
  waveIsConfirmed,
}: {
  waveDate: string;
  waveIsConfirmed: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const message = buildChallenge(waveDate, waveIsConfirmed);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused on an insecure origin or a locked-down
      // browser. The message is on screen either way.
    }
  }

  async function shareNatively() {
    try {
      if (typeof navigator.share !== "function") {
        await copy();
        return;
      }
      await navigator.share({ text: message });
    } catch {
      // Includes the guest simply dismissing the sheet — nothing to report.
    }
  }

  return (
    <div className={styles.shareBox}>
      <span className={sharedStyles.detailLabel}>Challenge someone</span>
      <p className={styles.shareLead}>You&rsquo;re in. Now make it competitive.</p>

      <p className={styles.shareMessage}>{message}</p>

      <div className={styles.shareActions}>
        <a
          className={sharedStyles.pillBtn}
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        <button type="button" className={sharedStyles.pillBtnOutline} onClick={copy}>
          {copied ? "Copied" : "Copy message"}
        </button>
        {/* Shown by CSS on touch devices only, rather than by checking
            navigator.share while rendering: the server has no navigator, so
            that check renders one thing on the server and another in the
            browser, and hydration flags the mismatch. A media query decides
            the same thing without React needing to know. */}
        <button type="button" className={`${sharedStyles.pillBtnOutline} ${styles.shareNative}`} onClick={shareNatively}>
          More…
        </button>
      </div>
    </div>
  );
}
