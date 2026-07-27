// FILE: lib/email/format.ts
// -----------------------------------------------------------------------------
// Shared money/date formatting for every email template in lib/email/.
// -----------------------------------------------------------------------------

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-HK", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const partyTypeLabels: Record<"solo" | "pair" | "group", string> = {
  solo: "Solo",
  pair: "Pair",
  group: "Group",
};
