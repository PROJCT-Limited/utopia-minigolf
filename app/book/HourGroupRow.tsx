"use client";

import { useState } from "react";
import type { HourGroup } from "@/lib/booking/waves";
import { formatWaveDate } from "../utils/formatWave";
import { WaveRow } from "./WaveRow";
import styles from "./book.module.css";

/**
 * Level 1 of the two-level picker: one hour, aggregated across its four
 * quarter-hour start times. Expands to reveal the individual start times
 * (Level 2, rendered as WaveRow cells in a 4-column grid) — that's what
 * actually gets booked.
 */
export function HourGroupRow({
  hourGroup,
  selectedWaveId,
  onSelect,
  showDate = true,
}: {
  hourGroup: HourGroup;
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
  showDate?: boolean;
}) {
  const containsSelected = hourGroup.waves.some((w) => w.id === selectedWaveId);
  const [expanded, setExpanded] = useState(containsSelected);

  return (
    <div className={styles.hourGroup}>
      <button
        type="button"
        className={styles.hourRow}
        disabled={hourGroup.isFull}
        onClick={() => setExpanded((e) => !e)}
      >
        {showDate && <span className={styles.hourDate}>{formatWaveDate(hourGroup.date)}</span>}
        <span className={styles.hourTime}>{hourGroup.hour}</span>
        {/* Whether an hour is bookable, never how much room is left in it —
            guests don't see exact availability counts. */}
        {hourGroup.isFull && <span className={styles.hourAvailability}>Full</span>}
        {!hourGroup.isFull && (
          <span className={`${styles.hourToggle} ${expanded ? styles.expanded : ""}`} aria-hidden>
            {expanded ? "−" : "+"}
          </span>
        )}
      </button>
      {expanded && !hourGroup.isFull && (
        <div className={styles.hourGroupBody}>
          {hourGroup.waves.map((w) => (
            <WaveRow
              key={w.id}
              wave={w}
              selected={selectedWaveId === w.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
