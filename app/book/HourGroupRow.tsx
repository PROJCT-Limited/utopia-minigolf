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
  headcount,
  selectedWaveId,
  onSelect,
  showDate = true,
}: {
  hourGroup: HourGroup;
  headcount: number;
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
  showDate?: boolean;
}) {
  const containsSelected = hourGroup.waves.some((w) => w.id === selectedWaveId);
  const [expanded, setExpanded] = useState(containsSelected);
  // Space doesn't pool across the hour's four start times — a group books one
  // of them — so an hour is closed to this group unless a single start time
  // inside it still fits them whole.
  const closed = hourGroup.isFull || hourGroup.largestGroupThatFits < headcount;

  return (
    <div className={styles.hourGroup}>
      <button
        type="button"
        className={styles.hourRow}
        disabled={closed}
        onClick={() => setExpanded((e) => !e)}
      >
        {showDate && <span className={styles.hourDate}>{formatWaveDate(hourGroup.date)}</span>}
        <span className={styles.hourTime}>{hourGroup.hour}</span>
        {/* Whether an hour is bookable, never how much room is left in it —
            guests don't see exact availability counts. */}
        {closed && (
          <span className={styles.hourAvailability}>
            {hourGroup.isFull ? "Sold out" : `No room for ${headcount}`}
          </span>
        )}
        {!closed && (
          <span className={`${styles.hourToggle} ${expanded ? styles.expanded : ""}`} aria-hidden>
            {expanded ? "−" : "+"}
          </span>
        )}
      </button>
      {expanded && !closed && (
        <div className={styles.hourGroupBody}>
          {hourGroup.waves.map((w) => (
            <WaveRow
              key={w.id}
              wave={w}
              headcount={headcount}
              selected={selectedWaveId === w.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
