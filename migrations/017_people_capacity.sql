-- =============================================================================
-- FOUND — capacity is counted in PEOPLE, not in groups.
--
-- Until now each quarter-hour start time held a fixed number of groups
-- (`total_wave_slots`), and one booking consumed exactly one of them
-- regardless of how many people it brought — so a start time sold as "3
-- groups" could seat anywhere from 3 to 15 people. The floor doesn't work
-- that way: what's finite is people on the stations. From here:
--
--   * every start time has a people cap (`people_capacity`, 15 by default —
--     see PEOPLE_PER_START_TIME in lib/booking/capacityConfig.ts)
--   * a group is still at most 5 people (MAX_HEADCOUNT in pricing.ts)
--   * any mix of groups fits as long as the people total stays within the cap
--
-- `total_wave_slots` / `wave_slots_used` are deliberately kept: renaming
-- columns under a live prod table isn't worth the risk, and the code still
-- needs a per-wave group counter for the admin panel's "N groups" figure.
-- `wave_slots_used` therefore keeps its current meaning (groups booked here)
-- and is still maintained on every booking; `total_wave_slots` stops gating
-- anything and is widened below so it can never bind before the people cap
-- does. Everything user-visible calls these "groups", never "wave slots".
--
-- Run this in the Supabase SQL editor, after 016_drop_public_sessions.sql.
-- =============================================================================

alter table waves
  add column people_capacity int not null default 15 check (people_capacity > 0),
  add column people_used     int not null default 0  check (people_used >= 0);

-- Backfill from what's actually sold. Only `paid` bookings hold capacity —
-- `pending` ones haven't cleared Stripe and `cancelled` ones released it.
update waves w
set people_used = coalesce(
  (select sum(b.headcount) from bookings b where b.wave_id = w.id and b.status = 'paid'),
  0
);

-- The group counter must never be the binding constraint. A start time can
-- hold at most `people_capacity` groups (that's the all-solo case), so match
-- it — anything smaller would reject a legal booking.
update waves set total_wave_slots = greatest(total_wave_slots, people_capacity);

-- Added after the backfill on purpose: if this fails, a wave is already
-- overbooked in people terms and needs a decision (raise its cap, or move a
-- booking) rather than a silently clamped number.
alter table waves
  add constraint waves_people_used_within_capacity check (people_used <= people_capacity);

create index if not exists waves_people_used_idx on waves (people_used);
