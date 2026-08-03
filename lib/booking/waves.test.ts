// waves.test.ts
import { describe, it, expect } from "vitest";
import {
  toWaveView,
  groupByWeek,
  groupByMonth,
  summarizeWavesByDay,
  busynessForDay,
  monthGridDays,
  shiftMonthKey,
  PROVISIONAL_LABEL,
  type WaveRow,
} from "./waves";

function row(overrides: Partial<WaveRow> = {}): WaveRow {
  return {
    id: "wave-1",
    date: "2026-09-05",
    start_time: "10:00:00",
    capacity: 12,
    booked: 0,
    status: "provisional",
    ...overrides,
  };
}

describe("toWaveView", () => {
  it("computes spots left from capacity minus booked", () => {
    const view = toWaveView(row({ capacity: 12, booked: 5 }));
    expect(view.spotsLeft).toBe(7);
    expect(view.isFull).toBe(false);
  });

  it("is full when status is 'full', even if spotsLeft would be > 0", () => {
    const view = toWaveView(row({ status: "full", capacity: 12, booked: 3 }));
    expect(view.isFull).toBe(true);
  });

  it("is full when booked reaches capacity, regardless of status", () => {
    const view = toWaveView(row({ status: "confirmed", capacity: 12, booked: 12 }));
    expect(view.isFull).toBe(true);
    expect(view.spotsLeft).toBe(0);
  });

  it("never reports negative spots left if overbooked", () => {
    const view = toWaveView(row({ capacity: 12, booked: 15 }));
    expect(view.spotsLeft).toBe(0);
  });

  it("shows the provisional label instead of a time for provisional waves", () => {
    const view = toWaveView(row({ status: "provisional", start_time: "14:30:00" }));
    expect(view.timeLabel).toBe(PROVISIONAL_LABEL);
  });

  it("shows a formatted time for confirmed waves", () => {
    const view = toWaveView(row({ status: "confirmed", start_time: "14:30:00" }));
    expect(view.timeLabel).toBe("14:30");
  });

  it("flags low availability at 2 spots or fewer, but not when full", () => {
    expect(toWaveView(row({ capacity: 12, booked: 10 })).isLowAvailability).toBe(true); // 2 left
    expect(toWaveView(row({ capacity: 12, booked: 9 })).isLowAvailability).toBe(false); // 3 left
    expect(toWaveView(row({ capacity: 12, booked: 12 })).isLowAvailability).toBe(false); // full, not "low"
  });
});

describe("groupByWeek", () => {
  it("groups waves under their Monday-start week", () => {
    const views = [
      toWaveView(row({ id: "a", date: "2026-09-05" })), // Saturday
      toWaveView(row({ id: "b", date: "2026-09-06" })), // Sunday, same week as the 5th
      toWaveView(row({ id: "c", date: "2026-09-07" })), // Monday, next week
    ];
    const groups = groupByWeek(views);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe("2026-08-31"); // Monday of the week containing Sep 5-6
    expect(groups[0].waves.map((w) => w.id)).toEqual(["a", "b"]);
    expect(groups[1].key).toBe("2026-09-07");
    expect(groups[1].waves.map((w) => w.id)).toEqual(["c"]);
  });

  it("sorts waves within a group by date then start time", () => {
    const views = [
      toWaveView(row({ id: "late", date: "2026-09-07", start_time: "17:30:00" })),
      toWaveView(row({ id: "early", date: "2026-09-07", start_time: "10:00:00" })),
    ];
    const groups = groupByWeek(views);
    expect(groups[0].waves.map((w) => w.id)).toEqual(["early", "late"]);
  });
});

describe("groupByMonth", () => {
  it("groups waves by calendar month", () => {
    const views = [
      toWaveView(row({ id: "a", date: "2026-09-05" })),
      toWaveView(row({ id: "b", date: "2026-09-26" })),
      toWaveView(row({ id: "c", date: "2026-10-03" })),
    ];
    const groups = groupByMonth(views);
    expect(groups.map((g) => g.key)).toEqual(["2026-09", "2026-10"]);
    expect(groups[0].waves.map((w) => w.id)).toEqual(["a", "b"]);
  });
});

describe("summarizeWavesByDay + busynessForDay", () => {
  it("aggregates spotsLeft/capacity across a day's waves", () => {
    const views = [
      toWaveView(row({ id: "a", date: "2026-09-05", capacity: 5, booked: 0 })),
      toWaveView(row({ id: "b", date: "2026-09-05", capacity: 5, booked: 5, status: "confirmed" })),
    ];
    const byDay = summarizeWavesByDay(views);
    const summary = byDay.get("2026-09-05");
    expect(summary).toEqual({ date: "2026-09-05", waveCount: 2, spotsLeft: 5, capacity: 10 });
  });

  it("is 'none' for a day with no waves, 'full' when no spots left", () => {
    expect(busynessForDay(undefined)).toBe("none");
    expect(busynessForDay({ date: "2026-09-05", waveCount: 1, spotsLeft: 0, capacity: 5 })).toBe("full");
  });

  it("is 'busy' at or below the 30% spots-left ratio, 'quiet' above it", () => {
    expect(busynessForDay({ date: "2026-09-05", waveCount: 1, spotsLeft: 1, capacity: 5 })).toBe("busy"); // 20%
    expect(busynessForDay({ date: "2026-09-05", waveCount: 1, spotsLeft: 3, capacity: 5 })).toBe("quiet"); // 60%
  });
});

describe("monthGridDays", () => {
  it("pads a month to whole Monday-start weeks", () => {
    // September 2026: 1st is a Tuesday, 30 days.
    const cells = monthGridDays("2026-09");
    expect(cells.length % 7).toBe(0);
    expect(cells[0]).toBeNull(); // Monday padding before Sep 1
    expect(cells[1]).toBe("2026-09-01");
    expect(cells[cells.length - 1] === null || cells[cells.length - 1] === "2026-09-30").toBe(true);
    expect(cells.filter((c) => c !== null)).toHaveLength(30);
  });

  it("starts a month that opens on Monday with no leading blanks", () => {
    // June 2026: 1st is a Monday.
    const cells = monthGridDays("2026-06");
    expect(cells[0]).toBe("2026-06-01");
  });
});

describe("shiftMonthKey", () => {
  it("moves forward and backward across year boundaries", () => {
    expect(shiftMonthKey("2026-09", 1)).toBe("2026-10");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });
});
