"use client";

import { useMemo, useState } from "react";
import { groupByWeek, type WaveView } from "@/lib/booking/waves";
import { formatWeekLabel } from "../utils/formatWave";
import { WaveRow } from "./WaveRow";
import { MonthCalendar } from "./MonthCalendar";
import styles from "./book.module.css";

export function WavePicker({
  waves,
  selectedWaveId,
  onSelect,
  takenWaveIds,
}: {
  waves: WaveView[];
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
  /** Wave IDs that already have a public session — shown as "Taken", not selectable. */
  takenWaveIds?: string[];
}) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const weekGroups = useMemo(() => groupByWeek(waves), [waves]);
  const takenSet = useMemo(() => new Set(takenWaveIds ?? []), [takenWaveIds]);

  return (
    <>
      <div className={styles.viewToggle}>
        <button type="button" className={viewMode === "week" ? styles.on : ""} onClick={() => setViewMode("week")}>
          Week
        </button>
        <button type="button" className={viewMode === "month" ? styles.on : ""} onClick={() => setViewMode("month")}>
          Month
        </button>
      </div>

      {viewMode === "month" ? (
        <MonthCalendar waves={waves} selectedWaveId={selectedWaveId} onSelect={onSelect} takenWaveIds={takenSet} />
      ) : (
        <div className={styles.waveGroups}>
          {weekGroups.length === 0 && <p className="hint">No slots available yet — check back soon.</p>}
          {weekGroups.map((g) => (
            <div key={g.key} className={styles.waveGroup}>
              <h4>{formatWeekLabel(g.key)}</h4>
              <div className={styles.waveList}>
                {g.waves.map((w) => (
                  <WaveRow key={w.id} wave={w} selected={selectedWaveId === w.id} onSelect={onSelect} taken={takenSet.has(w.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
