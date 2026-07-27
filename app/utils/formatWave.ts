// FILE: app/utils/formatWave.ts
// -----------------------------------------------------------------------------
// Shared, client-safe date formatting for wave dates — used by the booking
// wizard's wave picker and the manage-booking reschedule picker.
// -----------------------------------------------------------------------------

export function formatWaveDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekLabel(mondayKey: string): string {
  return `Week of ${formatWaveDate(mondayKey)}`;
}

export function formatMonthLabel(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
