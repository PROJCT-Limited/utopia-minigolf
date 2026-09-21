// FILE: lib/booking/supersededPendings.ts
// -----------------------------------------------------------------------------
// Which abandoned checkouts are provably dead.
//
// A booking row is written before payment, so every checkout somebody starts
// and doesn't finish leaves one behind. Most are honest abandonment and worth
// keeping — they're the signal that someone tried. But when the same person
// goes on to pay, their earlier attempts are answered: Zubin left three on one
// start time before completing the fourth, and all three sat in the admin
// panel looking like three people who couldn't book.
//
// Pure, so the rule can be tested without a database. The sweep that acts on
// it is in supersededPendingsRepo.ts.
// -----------------------------------------------------------------------------

export interface SweepableBooking {
  id: string;
  status: "pending" | "paid" | "cancelled";
  lead_email: string | null;
  lead_name: string | null;
  created_at: string;
}

/**
 * How long a pending booking is left alone regardless.
 *
 * Someone can legitimately have two checkouts going in one sitting — book
 * Friday for friends, pay, then start on Saturday — and the second shouldn't
 * vanish because the first went through. Two hours is far longer than a
 * checkout takes and far shorter than the gap in every real case here.
 */
export const PENDING_GRACE_MS = 2 * 60 * 60_000;

/**
 * The same person, by the two things they typed. Email does the work; the
 * name is matched too because that's the pair staff recognise a guest by, and
 * it keeps a shared family address from collapsing two people into one.
 */
function personKey(booking: SweepableBooking): string | null {
  const email = booking.lead_email?.trim().toLowerCase();
  if (!email) return null; // walk-ins have no email — never matchable
  return `${email}|${booking.lead_name?.trim().toLowerCase() ?? ""}`;
}

export function findSupersededPendings(
  bookings: SweepableBooking[],
  now: Date = new Date(),
  graceMs: number = PENDING_GRACE_MS
): string[] {
  const paidByPerson = new Map<string, number[]>();
  for (const booking of bookings) {
    if (booking.status !== "paid") continue;
    const key = personKey(booking);
    if (!key) continue;
    const times = paidByPerson.get(key) ?? [];
    times.push(Date.parse(booking.created_at));
    paidByPerson.set(key, times);
  }

  return bookings
    .filter((booking) => {
      if (booking.status !== "pending") return false;

      const key = personKey(booking);
      if (!key) return false;

      const startedAt = Date.parse(booking.created_at);
      if (!Number.isFinite(startedAt)) return false;
      if (now.getTime() - startedAt < graceMs) return false;

      // Only a payment that came *after* this attempt answers it. A pending
      // started later than the payment is a new intention, not a leftover.
      return (paidByPerson.get(key) ?? []).some((paidAt) => paidAt > startedAt);
    })
    .map((booking) => booking.id);
}
