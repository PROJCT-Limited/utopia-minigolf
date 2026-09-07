// waves.test.ts
import { describe, it, expect } from "vitest";
import {
  toWaveView,
  groupByWeek,
  groupByMonth,
  groupByHour,
  summarizeWavesByDay,
  busynessForDay,
  hasRoomFor,
  monthGridDays,
  shiftMonthKey,
  PROVISIONAL_LABEL,
  type WaveRow,
} from "./waves";

function row(overrides: Partial<WaveRow> = {}): WaveRow {
  return {
    id: "wave-1",
    date: "2026-09-30",
    start_time: "16:00:00",
    people_capacity: 15,
    people_used: 0,
    wave_slots_used: 0,
    status: "confirmed",
    ...overrides,
  };
}

describe("toWaveView", () => {
  it("computes people left from the cap minus the people booked", () => {
    const view = toWaveView(row({ people_capacity: 15, people_used: 4 }));
    expect(view.peopleLeft).toBe(11);
    expect(view.isFull).toBe(false);
  });

  it("reports groups booked separately from people booked", () => {
    // 4 groups holding 12 people between them: both numbers, one row.
    const view = toWaveView(row({ people_capacity: 15, people_used: 12, wave_slots_used: 4 }));
    expect(view.groupsBooked).toBe(4);
    expect(view.peopleUsed).toBe(12);
    expect(view.peopleLeft).toBe(3);
    expect(view.isFull).toBe(false);
  });

  it("is full when status is 'full', even if peopleLeft would be > 0", () => {
    const view = toWaveView(row({ status: "full", people_capacity: 15, people_used: 3 }));
    expect(view.isFull).toBe(true);
  });

  it("is full when people_used reaches the cap, regardless of status", () => {
    const view = toWaveView(row({ status: "confirmed", people_capacity: 15, people_used: 15 }));
    expect(view.isFull).toBe(true);
    expect(view.peopleLeft).toBe(0);
  });

  it("never reports negative people left if overbooked", () => {
    const view = toWaveView(row({ people_capacity: 15, people_used: 18 }));
    expect(view.peopleLeft).toBe(0);
  });

  it("shows the provisional label instead of a time for provisional waves", () => {
    const view = toWaveView(row({ status: "provisional", start_time: "14:30:00" }));
    expect(view.timeLabel).toBe(PROVISIONAL_LABEL);
  });

  it("shows a formatted time for confirmed waves", () => {
    const view = toWaveView(row({ status: "confirmed", start_time: "14:30:00" }));
    expect(view.timeLabel).toBe("14:30");
  });

  it("flags low availability below a full group's worth of space, but not when full", () => {
    expect(toWaveView(row({ people_capacity: 15, people_used: 11 })).isLowAvailability).toBe(true); // 4 left
    expect(toWaveView(row({ people_capacity: 15, people_used: 10 })).isLowAvailability).toBe(false); // 5 left
    expect(toWaveView(row({ people_capacity: 15, people_used: 15 })).isLowAvailability).toBe(false); // full, not "low"
  });
});

describe("hasRoomFor", () => {
  it("takes party size into account, not just whether anything is left", () => {
    // The brief's case: 3 spaces left is open to a three, closed to a four.
    const wave = toWaveView(row({ people_capacity: 15, people_used: 12 }));
    expect(hasRoomFor(wave, 3)).toBe(true);
    expect(hasRoomFor(wave, 4)).toBe(false);
  });

  it("is closed to everyone once the start time is full", () => {
    const wave = toWaveView(row({ status: "full", people_capacity: 15, people_used: 2 }));
    expect(hasRoomFor(wave, 1)).toBe(false);
  });

  it("fits any legal mix of groups up to the cap", () => {
    // 3 groups of 5 and 5 groups of 3 both come to 15 and both fill it.
    const threeFives = toWaveView(row({ people_capacity: 15, people_used: 5 * 3, wave_slots_used: 3 }));
    const fiveThrees = toWaveView(row({ people_capacity: 15, people_used: 3 * 5, wave_slots_used: 5 }));
    expect(threeFives.isFull).toBe(true);
    expect(fiveThrees.isFull).toBe(true);
    expect(fiveThrees.groupsBooked).toBe(5);
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

describe("groupByHour", () => {
  it("groups the four quarter-hour start times under their containing hour", () => {
    const views = [
      toWaveView(row({ id: "a", start_time: "16:00:00", people_capacity: 15, people_used: 0 })),
      toWaveView(row({ id: "b", start_time: "16:15:00", people_capacity: 15, people_used: 0 })),
      toWaveView(row({ id: "c", start_time: "16:30:00", people_capacity: 15, people_used: 0 })),
      toWaveView(row({ id: "d", start_time: "16:45:00", people_capacity: 15, people_used: 0 })),
      toWaveView(row({ id: "e", start_time: "17:00:00", people_capacity: 15, people_used: 0 })),
    ];
    const groups = groupByHour(views);
    expect(groups).toHaveLength(2);
    expect(groups[0].hour).toBe("16:00");
    expect(groups[0].waves.map((w) => w.id)).toEqual(["a", "b", "c", "d"]);
    expect(groups[0].peopleLeft).toBe(60); // 4 start times x 15
    expect(groups[0].peopleCapacity).toBe(60);
    expect(groups[0].largestGroupThatFits).toBe(15);
    expect(groups[1].hour).toBe("17:00");
    expect(groups[1].waves.map((w) => w.id)).toEqual(["e"]);
  });

  it("is full only when every start time in the hour is full", () => {
    const partiallyFull = groupByHour([
      toWaveView(row({ id: "a", start_time: "16:00:00", people_capacity: 15, people_used: 15 })), // full
      toWaveView(row({ id: "b", start_time: "16:15:00", people_capacity: 15, people_used: 11 })),
    ]);
    expect(partiallyFull[0].isFull).toBe(false);
    expect(partiallyFull[0].peopleLeft).toBe(4); // the full one contributes 0

    const fullyFull = groupByHour([
      toWaveView(row({ id: "a", start_time: "16:00:00", people_capacity: 15, people_used: 15 })),
      toWaveView(row({ id: "b", start_time: "16:15:00", people_capacity: 15, people_used: 15 })),
    ]);
    expect(fullyFull[0].isFull).toBe(true);
  });

  it("sizes largestGroupThatFits on the roomiest single start time, not the hour's total", () => {
    // 3 + 3 spaces across two start times is six spaces and still no room for
    // a four — space doesn't pool, because a group books one start time.
    const groups = groupByHour([
      toWaveView(row({ id: "a", start_time: "16:00:00", people_capacity: 15, people_used: 12 })),
      toWaveView(row({ id: "b", start_time: "16:15:00", people_capacity: 15, people_used: 12 })),
    ]);
    expect(groups[0].peopleLeft).toBe(6);
    expect(groups[0].largestGroupThatFits).toBe(3);
  });

  it("keeps different dates in separate hour groups", () => {
    const groups = groupByHour([
      toWaveView(row({ id: "a", date: "2026-09-30", start_time: "16:00:00" })),
      toWaveView(row({ id: "b", date: "2026-10-01", start_time: "16:00:00" })),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.date)).toEqual(["2026-09-30", "2026-10-01"]);
  });
});

describe("summarizeWavesByDay + busynessForDay", () => {
  it("aggregates groups and people across a day's start times", () => {
    const views = [
      toWaveView(row({ id: "a", date: "2026-09-05", people_capacity: 15, people_used: 0, wave_slots_used: 0 })),
      toWaveView(row({ id: "b", date: "2026-09-05", people_capacity: 15, people_used: 15, wave_slots_used: 4 })),
    ];
    const byDay = summarizeWavesByDay(views);
    expect(byDay.get("2026-09-05")).toEqual({
      date: "2026-09-05",
      startTimeCount: 2,
      groupsBooked: 4,
      peopleUsed: 15,
      peopleLeft: 15,
      peopleCapacity: 30,
    });
  });

  it("is 'none' for a day with no start times, 'full' when no people fit", () => {
    expect(busynessForDay(undefined)).toBe("none");
    expect(
      busynessForDay({ date: "2026-09-05", startTimeCount: 1, groupsBooked: 3, peopleUsed: 15, peopleLeft: 0, peopleCapacity: 15 })
    ).toBe("full");
  });

  it("is 'busy' at or below the 30% people-left ratio, 'quiet' above it", () => {
    expect(
      busynessForDay({ date: "2026-09-05", startTimeCount: 1, groupsBooked: 3, peopleUsed: 12, peopleLeft: 3, peopleCapacity: 15 })
    ).toBe("busy"); // 20%
    expect(
      busynessForDay({ date: "2026-09-05", startTimeCount: 1, groupsBooked: 2, peopleUsed: 6, peopleLeft: 9, peopleCapacity: 15 })
    ).toBe("quiet"); // 60%
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
