"use client";

import { useMemo, useState } from "react";
import {
  summarizeWavesByDay,
  busynessForDay,
  monthGridDays,
  shiftMonthKey,
  type WaveView,
} from "@/lib/booking/waves";
import { formatMonthLabel } from "../utils/formatWave";
import { WaveRow } from "./WaveRow";
import styles from "./book.module.css";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthCalendar({
  waves,
  selectedWaveId,
  onSelect,
  takenWaveIds,
}: {
  waves: WaveView[];
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
  takenWaveIds?: Set<string>;
}) {
  const [viewMonth, setViewMonth] = useState(() => (waves[0] ? waves[0].date.slice(0, 7) : todayMonthKey()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daySummaries = useMemo(() => summarizeWavesByDay(waves), [waves]);
  const gridDays = useMemo(() => monthGridDays(viewMonth), [viewMonth]);
  const dayWaves = useMemo(
    () =>
      selectedDate
        ? waves.filter((w) => w.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
        : [],
    [waves, selectedDate]
  );

  return (
    <div>
      <div className={styles.calendarHeader}>
        <button type="button" className={styles.calendarNav} onClick={() => setViewMonth((m) => shiftMonthKey(m, -1))} aria-label="Previous month">
          ‹
        </button>
        <span>{formatMonthLabel(viewMonth)}</span>
        <button type="button" className={styles.calendarNav} onClick={() => setViewMonth((m) => shiftMonthKey(m, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      <div className={styles.calendarWeekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {gridDays.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} className={styles.calendarCell} />;
          const busyness = busynessForDay(daySummaries.get(date));
          const dayNum = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              type="button"
              className={`${styles.calendarCell} ${styles.calendarDay} ${selectedDate === date ? styles.calendarDayOn : ""}`}
              disabled={busyness === "none"}
              onClick={() => setSelectedDate(date)}
            >
              <span>{dayNum}</span>
              {busyness !== "none" && <span className={`${styles.calendarDot} ${styles["busy-" + busyness]}`} />}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className={styles.waveList} style={{ marginTop: 16 }}>
          {dayWaves.length === 0 ? (
            <p className="hint">No slots that day.</p>
          ) : (
            dayWaves.map((w) => (
              <WaveRow
                key={w.id}
                wave={w}
                selected={selectedWaveId === w.id}
                onSelect={onSelect}
                showDate={false}
                taken={takenWaveIds?.has(w.id) ?? false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
