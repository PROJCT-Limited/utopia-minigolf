// FILE: lib/partners/validation.ts
// -----------------------------------------------------------------------------
// Pure partner-input validation — no Supabase import here on purpose (same
// reasoning as lib/booking/pricing.ts), so this is testable without a
// database and safe to import from both the admin "use server" actions and
// tests.
// -----------------------------------------------------------------------------

const REF_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** Lowercase letters, numbers, and hyphens only — shareable in a URL as-is. */
export function isValidRefCode(refCode: string): boolean {
  return REF_CODE_PATTERN.test(refCode);
}

/** "5" -> 0.05. Returns null for anything outside 0-100, non-numeric, or empty input. */
export function parseCommissionRatePercent(rawPercent: string): number | null {
  if (rawPercent.trim() === "") return null; // Number("") is 0, not NaN — reject explicitly
  const percent = Number(rawPercent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  return Math.round(percent * 100) / 10000; // keeps 2 decimal places of percent precision
}

// Never stored — always computed fresh, so a rate change recalculates
// cleanly for every past booking without a backfill.
export function computeCommissionOwedCents(salesCents: number, commissionRate: number): number {
  return Math.round(salesCents * commissionRate);
}
