// FILE: lib/booking/capacityConfig.ts
// -----------------------------------------------------------------------------
// The one place the people-per-start-time cap is decided. Every quarter-hour
// start time gets `people_capacity` on its own row (see
// migrations/017_people_capacity.sql) so a single busy evening can be tuned
// from the admin panel without a deploy; this constant is only the default
// that new start times are created with, and the fallback for a row that
// somehow has no cap of its own.
//
// SERVER ONLY. PEOPLE_PER_START_TIME reads a non-NEXT_PUBLIC env var, which
// is `undefined` in the browser — importing this from a client component
// would silently swap the configured value for the 15 below. Client code
// reads the per-wave numbers off WaveView instead (lib/booking/waves.ts),
// which the server has already resolved.
// -----------------------------------------------------------------------------

const DEFAULT_PEOPLE_PER_START_TIME = 15;

function readCap(): number {
  const raw = process.env.PEOPLE_PER_START_TIME;
  if (!raw) return DEFAULT_PEOPLE_PER_START_TIME;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(
      `PEOPLE_PER_START_TIME must be a positive integer, got ${JSON.stringify(raw)} — falling back to ${DEFAULT_PEOPLE_PER_START_TIME}.`
    );
    return DEFAULT_PEOPLE_PER_START_TIME;
  }
  return parsed;
}

/** How many people one quarter-hour start time holds, by default. */
export const PEOPLE_PER_START_TIME = readCap();
