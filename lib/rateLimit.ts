// FILE: lib/rateLimit.ts
// -----------------------------------------------------------------------------
// Postgres-backed rate limiting (via `rate_limit_events`) — not in-memory,
// because this app runs as stateless serverless functions where in-process
// counters wouldn't be shared across invocations/instances.
//
// One row per attempt; a request is allowed if fewer than `max` rows exist
// for (scope, key) within the trailing `windowMinutes`. The count-then-insert
// isn't wrapped in a transaction, so two truly simultaneous callers could
// both slip through once — an acceptable race for a throttle, not a hard limit.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface RateLimitOptions {
  max: number;
  windowMinutes: number;
}

export async function checkRateLimit(
  scope: string,
  key: string,
  { max, windowMinutes }: RateLimitOptions
): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("key", key)
    .gte("created_at", since);

  if (error) {
    // Fail open on a lookup error — don't let a rate-limit outage take down
    // the underlying feature. The insert below still records this attempt.
    console.error(`checkRateLimit(${scope}): lookup failed:`, error.message);
  } else if ((count ?? 0) >= max) {
    return { allowed: false };
  }

  const { error: insertError } = await supabaseAdmin.from("rate_limit_events").insert({ scope, key });
  if (insertError) {
    console.error(`checkRateLimit(${scope}): insert failed:`, insertError.message);
  }

  return { allowed: true };
}
