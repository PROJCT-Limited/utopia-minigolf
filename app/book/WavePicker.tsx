"use client";

import { useMemo, useState } from "react";
import { groupByWeek, groupByMonth, type WaveView } from "@/lib/booking/waves";
import { formatWaveDate, formatWeekLabel, formatMonthLabel } from "../utils/formatWave";
import styles from "./book.module.css";

export function WavePicker({
  waves,
  selectedWaveId,
  onSelect,
}: {
  waves: WaveView[];
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const weekGroups = useMemo(() => groupByWeek(waves), [waves]);
  const monthGroups = useMemo(() => groupByMonth(waves), [waves]);
  const groups = viewMode === "week" ? weekGroups : monthGroups;

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
                    onClick={() => onSelect(w.id)}
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
  );
}
