import { describe, it, expect } from "vitest";
import {
  busiestDayPeople,
  filterWaves,
  groupWavesByDate,
  isWaveFilter,
  loadLevel,
  summarizeDayLoad,
} from "./dayLoad";
import type { AdminWaveListItem } from "./waves";

function wave(overrides: Partial<AdminWaveListItem> = {}): AdminWaveListItem {
  return {
    id: overrides.id ?? "w1",
    date: "2026-10-08",
    startTime: "16:00:00",
    status: "confirmed",
    peopleCapacity: 15,
    peopleUsed: 0,
    peopleLeft: 15,
    groupsBooked: 0,
    isFull: false,
    isLowAvailability: false,
    timeLabel: "16:00",
    visibility: "public",
    isHidden: false,
    paidBookingCount: 0,
    paidPeopleCount: 0,
    pendingBookingCount: 0,
    pendingPeopleCount: 0,
    privateToken: null,
    capacityCounterDrift: false,
    ...overrides,
  };
}

describe("summarizeDayLoad", () => {
  it("totals a day's start times, paid people and groups", () => {
    const days = summarizeDayLoad([
      wave({ id: "a", paidBookingCount: 1, paidPeopleCount: 4 }),
      wave({ id: "b", startTime: "16:15:00", paidBookingCount: 2, paidPeopleCount: 5 }),
      wave({ id: "c", startTime: "16:30:00" }),
    ]);

    const day = days.get("2026-10-08");
    expect(day).toMatchObject({
      startTimeCount: 3,
      bookedStartTimeCount: 2,
      peopleCapacity: 45,
      peopleBooked: 9,
      groupsBooked: 3,
    });
  });

  it("keeps pending checkouts out of the booked figures", () => {
    const days = summarizeDayLoad([wave({ pendingBookingCount: 1, pendingPeopleCount: 3 })]);
    const day = days.get("2026-10-08");

    expect(day?.peopleBooked).toBe(0);
    expect(day?.bookedStartTimeCount).toBe(0);
    expect(day?.pendingPeople).toBe(3);
  });

  it("counts unlisted start times per day", () => {
    const days = summarizeDayLoad([
      wave({ id: "a", isHidden: true, visibility: "hidden" }),
      wave({ id: "b", startTime: "16:15:00" }),
    ]);

    expect(days.get("2026-10-08")?.hiddenCount).toBe(1);
  });

  it("splits by date", () => {
    const days = summarizeDayLoad([wave({ id: "a" }), wave({ id: "b", date: "2026-10-09" })]);
    expect([...days.keys()]).toEqual(["2026-10-08", "2026-10-09"]);
  });
});

describe("loadLevel", () => {
  it("is flat when nothing is booked anywhere", () => {
    expect(loadLevel(0, 0)).toBe(0);
    expect(loadLevel(0, 40)).toBe(0);
  });

  it("gives the busiest day the darkest step", () => {
    expect(loadLevel(40, 40)).toBe(4);
  });

  it("steps by share of the busiest day, not by share of capacity", () => {
    // 4 people is a thin evening in absolute terms but half the best day on
    // the board — the calendar is a ranking, so it has to read as mid-range.
    expect(loadLevel(4, 8)).toBe(3);
    expect(loadLevel(2, 8)).toBe(2);
    expect(loadLevel(1, 8)).toBe(1);
  });

  it("never gives a day with a booking the same step as an empty one", () => {
    expect(loadLevel(1, 1000)).toBe(1);
  });
});

describe("busiestDayPeople", () => {
  it("is the highest booked-people figure on the board", () => {
    const days = summarizeDayLoad([
      wave({ id: "a", paidPeopleCount: 4, paidBookingCount: 1 }),
      wave({ id: "b", date: "2026-10-09", paidPeopleCount: 11, paidBookingCount: 3 }),
    ]);
    expect(busiestDayPeople(days.values())).toBe(11);
  });

  it("is 0 with nothing booked", () => {
    expect(busiestDayPeople(summarizeDayLoad([wave()]).values())).toBe(0);
  });
});

describe("filterWaves", () => {
  const waves = [
    wave({ id: "paid", paidBookingCount: 1, paidPeopleCount: 2 }),
    wave({ id: "pending", startTime: "16:15:00", pendingBookingCount: 1, pendingPeopleCount: 2 }),
    wave({ id: "empty", startTime: "16:30:00" }),
    wave({ id: "unlisted", startTime: "16:45:00", isHidden: true, visibility: "hidden" }),
  ];

  it("counts a start time somebody is mid-checkout on as booked", () => {
    expect(filterWaves(waves, "booked").map((w) => w.id)).toEqual(["paid", "pending"]);
  });

  it("leaves only the untouched start times under 'free'", () => {
    expect(filterWaves(waves, "free").map((w) => w.id)).toEqual(["empty", "unlisted"]);
  });

  it("picks out unlisted start times whether or not they're booked", () => {
    expect(filterWaves(waves, "hidden").map((w) => w.id)).toEqual(["unlisted"]);
  });

  it("passes everything through under 'all'", () => {
    expect(filterWaves(waves, "all")).toHaveLength(4);
  });
});

describe("isWaveFilter", () => {
  it("accepts the known filters and nothing else", () => {
    expect(isWaveFilter("booked")).toBe(true);
    expect(isWaveFilter("all")).toBe(true);
    expect(isWaveFilter("everything")).toBe(false);
    expect(isWaveFilter(undefined)).toBe(false);
  });
});

describe("groupWavesByDate", () => {
  it("orders days, and start times within a day", () => {
    const grouped = groupWavesByDate([
      wave({ id: "later", date: "2026-10-09", startTime: "18:00:00" }),
      wave({ id: "second", startTime: "16:15:00" }),
      wave({ id: "first", startTime: "16:00:00" }),
    ]);

    expect(grouped.map((g) => g.date)).toEqual(["2026-10-08", "2026-10-09"]);
    expect(grouped[0].waves.map((w) => w.id)).toEqual(["first", "second"]);
  });
});
