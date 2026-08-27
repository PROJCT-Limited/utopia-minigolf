"use client";

import { useState } from "react";
import type { HourGroup } from "@/lib/booking/waves";
import { formatWaveDate } from "../utils/formatWave";
import { WaveRow } from "./WaveRow";
import styles from "./book.module.css";

/**
 * Level 1 of the two-level picker: one hour, aggregated across its four
 * quarter-hour start times. Expands to reveal the individual start times
 * (Level 2, rendered as WaveRows) — that's what actually gets booked.
 */
export function HourGroupRow({
  hourGroup,
  selectedWaveId,
  onSelect,
  showDate = true,
  takenWaveIds,
}: {
  hourGroup: HourGroup;
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
  showDate?: boolean;
  /** Wave IDs that already have a public session — shown as "Taken", not selectable. */
  takenWaveIds?: Set<string>;
}) {
  const containsSelected = hourGroup.waves.some((w) => w.id === selectedWaveId);
  const [expanded, setExpanded] = useState(containsSelected);

  return (
    <div className={styles.hourGroup}>
      <div className={styles.waveRow}>
        {showDate && <span className={styles.waveDate}>{formatWaveDate(hourGroup.date)}</span>}
        <button
          type="button"
          className={`bwave ${containsSelected ? "on" : ""}`}
          disabled={hourGroup.isFull}
          onClick={() => setExpanded((e) => !e)}
          style={{ flex: 1 }}
        >
          <span className={`dot ${hourGroup.isFull ? "out" : ""}`} />
          <div>
            <div className="tm">{hourGroup.hour}</div>
          </div>
          <span className="st">
            {hourGroup.isFull ? "Full" : `${hourGroup.slotsLeft} group${hourGroup.slotsLeft === 1 ? "" : "s"} left`}
          </span>
        </button>
      </div>
      {expanded && !hourGroup.isFull && (
        <div className={styles.hourGroupBody}>
          {hourGroup.waves.map((w) => (
            <WaveRow
              key={w.id}
              wave={w}
              selected={selectedWaveId === w.id}
              onSelect={onSelect}
              showDate={false}
              taken={takenWaveIds?.has(w.id) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
