import { describe, it, expect } from "vitest";
import { digestDayFor, summarizeDay, type DigestBookingRow, type DigestWaveRow } from "./dailyDigest";

const WAVES: DigestWaveRow[] = [
  { id: "in-season", date: "2026-10-09", start_time: "19:15:00", people_capacity: 15 },
  { id: "in-season-2", date: "2026-10-10", start_time: "20:00:00", people_capacity: 15 },
  // Stranded on a date the season no longer covers — see migration 019.
  { id: "out-of-season", date: "2026-09-30", start_time: "16:30:00", people_capacity: 15 },
];

function booking(overrides: Partial<DigestBookingRow> = {}): DigestBookingRow {
  return {
    created_at: "2026-09-14T04:00:00.000Z", // 12:00 in Hong Kong
    status: "paid",
    headcount: 2,
    ticket_type: "standard",
    amount_paid_cents: 24000,
    wave_id: "in-season",
    ...overrides,
  };
}

const DAY = "2026-09-14";

describe("summarizeDay", () => {
  it("counts today's paid bookings as people, groups and money", () => {
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [booking(), booking({ headcount: 3, amount_paid_cents: 36000 })],
    });

    expect(stats.today.people).toBe(5);
    expect(stats.today.groups).toBe(2);
    expect(stats.today.revenueCents).toBe(60000);
  });

  it("cuts the day on Hong Kong's clock, not the server's", () => {
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [
        // 23:30 HK on the 14th — still the 14th in HK, already the 15th nowhere
        // yet, but only 15:30Z. A UTC-day digest would file it correctly here
        // and get the next one wrong:
        booking({ created_at: "2026-09-14T15:30:00.000Z" }),
        // 00:30 HK on the 14th is 16:30Z on the 13th. This is the booking a
        // UTC day boundary would put in yesterday's email.
        booking({ created_at: "2026-09-13T16:30:00.000Z" }),
        // 00:30 HK on the 15th — tomorrow's, not today's.
        booking({ created_at: "2026-09-14T16:30:00.000Z" }),
      ],
    });

    expect(stats.today.groups).toBe(2);
  });

  it("keeps unfinished checkouts out of the money and counts them separately", () => {
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [booking({ status: "pending", headcount: 4 }), booking()],
    });

    expect(stats.today.people).toBe(2);
    expect(stats.today.revenueCents).toBe(24000);
    expect(stats.today.pendingPeople).toBe(4);
  });

  it("ignores bookings made on other days", () => {
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [booking({ created_at: "2026-09-01T04:00:00.000Z" })],
    });

    expect(stats.today.people).toBe(0);
    expect(stats.today.slots).toEqual([]);
  });

  it("splits today's people by ticket type", () => {
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [booking(), booking({ ticket_type: "unlimited", headcount: 3 })],
    });

    expect(stats.today.byTicketType).toEqual([
      { label: "Standard", people: 2 },
      { label: "Unlimited", people: 3 },
    ]);
  });

  it("lists the start times booked today, busiest first", () => {
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [
        booking({ wave_id: "in-season", headcount: 1 }),
        booking({ wave_id: "in-season-2", headcount: 5 }),
        booking({ wave_id: "in-season", headcount: 1 }),
      ],
    });

    expect(stats.today.slots).toEqual([
      { date: "2026-10-10", time: "20:00", people: 5 },
      { date: "2026-10-09", time: "19:15", people: 2 },
    ]);
  });

  it("counts the season from bookings inside the window only", () => {
    // A booking stranded outside the season isn't business anyone can still
    // have, and counting it would overstate the run every single night.
    const stats = summarizeDay({
      day: DAY,
      waves: WAVES,
      bookings: [
        booking({ created_at: "2026-08-20T04:00:00.000Z" }),
        booking({ wave_id: "out-of-season", created_at: "2026-08-20T04:00:00.000Z" }),
      ],
    });

    expect(stats.season.people).toBe(2);
    expect(stats.season.groups).toBe(1);
  });

  it("measures capacity across the season's start times only", () => {
    const stats = summarizeDay({ day: DAY, waves: WAVES, bookings: [] });
    expect(stats.season.capacity).toBe(30);
  });
});

describe("digestDayFor", () => {
  it("reports the day that just ended when it runs at Hong Kong midnight", () => {
    // 16:00Z is 00:00 the next day in HK; the digest should still be about the
    // day that has just finished.
    expect(digestDayFor(new Date("2026-09-14T16:00:00.000Z"))).toBe("2026-09-14");
  });

  it("reports the current day when run by hand during working hours", () => {
    // 06:00Z is 14:00 in Hong Kong.
    expect(digestDayFor(new Date("2026-09-14T06:00:00.000Z"))).toBe("2026-09-14");
  });
});
