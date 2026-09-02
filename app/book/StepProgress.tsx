import styles from "./book.module.css";

const STEPS = ["Ticket", "Slot", "Details", "Review"];

/**
 * Mono step line under the page header — "01 TICKET  02 SLOT  03 DETAILS
 * 04 REVIEW" with a thin fill bar underneath — plus an optional recap of
 * choices already made ("Standard", "Sep 30, 16:15"), so earlier decisions
 * stay visible instead of vanishing once you move past that step.
 */
export function StepProgress({ current, recap = [] }: { current: number; recap?: string[] }) {
  return (
    <div className={styles.progressWrap}>
      <div className={styles.centerInner}>
        <div className={styles.progress}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < current ? "done" : n === current ? "current" : "";
            return (
              <span key={label} className={`${styles.progressStep} ${styles[state] ?? ""}`}>
                {String(n).padStart(2, "0")} {label}
              </span>
            );
          })}
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressBarFill} style={{ width: `${(current / STEPS.length) * 100}%` }} />
        </div>
        {recap.length > 0 && (
          <div className={styles.recap}>
            {recap.map((item) => (
              <span key={item} className={styles.recapChip}>
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
