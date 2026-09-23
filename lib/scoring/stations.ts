// FILE: lib/scoring/stations.ts
// -----------------------------------------------------------------------------
// The 5-station journey doesn't have set names anywhere in this codebase
// (site copy just says "5 stations" generically) — kept generic here too.
// -----------------------------------------------------------------------------

export const STATION_NUMBERS = [1, 2, 3, 4, 5] as const;
export type StationNumber = (typeof STATION_NUMBERS)[number];

/** Five. Derived rather than written twice — KioskFlow used to keep its own
 *  copy of this constant. */
export const STATION_COUNT = STATION_NUMBERS.length;

export function stationLabel(stationNumber: number): string {
  return `Station ${stationNumber}`;
}
