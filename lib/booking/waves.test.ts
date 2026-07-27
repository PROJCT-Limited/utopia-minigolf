// waves.test.ts
import { describe, it, expect } from "vitest";
import { toWaveView, groupByWeek, groupByMonth, PROVISIONAL_LABEL, type WaveRow } from "./waves";

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

  it("flags low availability at 4 spots or fewer, but not when full", () => {
    expect(toWaveView(row({ capacity: 12, booked: 8 })).isLowAvailability).toBe(true); // 4 left
    expect(toWaveView(row({ capacity: 12, booked: 7 })).isLowAvailability).toBe(false); // 5 left
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
