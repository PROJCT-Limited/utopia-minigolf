"use client";

import { useMemo, useState } from "react";
import { groupByWeek, groupByHour, type SlotRule, type WaveView } from "@/lib/booking/waves";
import { formatWeekLabel } from "../utils/formatWave";
import { HourGroupRow } from "./HourGroupRow";
import { MonthCalendar } from "./MonthCalendar";
import styles from "./book.module.css";

export function WavePicker({
  waves,
  headcount,
  selectedWaveId,
  onSelect,
  slotRule = null,
}: {
  waves: WaveView[];
  /** Party size: capacity is people, so this decides what's still bookable. */
  headcount: number;
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
  /** What the chosen ticket rules out (Family: evenings). */
  slotRule?: SlotRule | null;
}) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const weekGroups = useMemo(() => groupByWeek(waves), [waves]);

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

      {slotRule && <p className={styles.slotRuleNote}>{slotRule.note}.</p>}

      {viewMode === "month" ? (
        <MonthCalendar
          waves={waves}
          headcount={headcount}
          selectedWaveId={selectedWaveId}
          onSelect={onSelect}
          slotRule={slotRule}
        />
      ) : (
        <div className={styles.waveGroups}>
          {weekGroups.length === 0 && <p className={styles.hint}>No slots available yet — check back soon.</p>}
          {weekGroups.map((g) => (
            <div key={g.key} className={styles.waveGroup}>
              <h4 className={styles.waveGroupLabel}>{formatWeekLabel(g.key)}</h4>
              <div className={styles.waveList}>
                {groupByHour(g.waves).map((hourGroup) => (
                  <HourGroupRow
                    key={hourGroup.key}
                    hourGroup={hourGroup}
                    headcount={headcount}
                    selectedWaveId={selectedWaveId}
                    onSelect={onSelect}
                    slotRule={slotRule}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
