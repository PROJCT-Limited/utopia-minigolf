"use client";

import { useMemo, useState } from "react";
import {
  summarizeWavesByDay,
  busynessForDay,
  monthGridDays,
  shiftMonthKey,
  groupByHour,
  hasRoomFor,
  type WaveView,
} from "@/lib/booking/waves";
import { formatMonthLabel } from "../utils/formatWave";
import { HourGroupRow } from "./HourGroupRow";
import styles from "./book.module.css";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthCalendar({
  waves,
  headcount,
  selectedWaveId,
  onSelect,
}: {
  waves: WaveView[];
  headcount: number;
  selectedWaveId: string | null;
  onSelect: (waveId: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => (waves[0] ? waves[0].date.slice(0, 7) : todayMonthKey()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daySummaries = useMemo(() => summarizeWavesByDay(waves), [waves]);
  // A day is only offerable if one of its start times fits this group whole —
  // a day with ten spaces spread one-per-start-time seats nobody but a solo.
  const daysThatFit = useMemo(
    () => new Set(waves.filter((w) => hasRoomFor(w, headcount)).map((w) => w.date)),
    [waves, headcount]
  );
  const gridDays = useMemo(() => monthGridDays(viewMonth), [viewMonth]);
  const dayHourGroups = useMemo(
    () => (selectedDate ? groupByHour(waves.filter((w) => w.date === selectedDate)) : []),
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
          const fits = daysThatFit.has(date);
          const dayNum = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              type="button"
              className={`${styles.calendarCell} ${styles.calendarDay} ${selectedDate === date ? styles.calendarDayOn : ""}`}
              disabled={busyness === "none" || !fits}
              title={busyness !== "none" && !fits ? `No room for ${headcount} that day` : undefined}
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
          {dayHourGroups.length === 0 ? (
            <p className={styles.hint}>No slots that day.</p>
          ) : (
            dayHourGroups.map((hourGroup) => (
              <HourGroupRow
                key={hourGroup.key}
                hourGroup={hourGroup}
                headcount={headcount}
                selectedWaveId={selectedWaveId}
                onSelect={onSelect}
                showDate={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
