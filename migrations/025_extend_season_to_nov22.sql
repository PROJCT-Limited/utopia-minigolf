-- =============================================================================
-- FOUND — the season runs to 22 Nov 2026, a month on from the 22 Oct launch.
--
-- BOOKABLE_WINDOW_END in lib/booking/waves.ts now reads 2026-11-22. This file
-- creates 12–22 Nov in the same shape as the rest of November: start times,
-- group counts and people caps are copied from 1–11 Nov (mode() per start
-- time, as in 019), so a hand-tuned evening can't skew them.
--
-- The window start stays 2026-10-08: the soft-launch evenings before 22 Oct
-- stay bookable, they're just not in the headline dates.
--
-- Run this in the Supabase SQL editor, after 024_people_capacity_10.sql.
-- =============================================================================

insert into waves (date, start_time, total_wave_slots, wave_slots_used, status, people_capacity, people_used)
select
  d::date,
  tpl.start_time,
  tpl.total_wave_slots,
  0,
  'confirmed',
  tpl.people_capacity,
  0
from generate_series('2026-11-12'::date, '2026-11-22'::date, '1 day'::interval) as d
cross join (
  select
    start_time,
    mode() within group (order by total_wave_slots) as total_wave_slots,
    mode() within group (order by people_capacity)  as people_capacity
  from waves
  where date between '2026-11-01' and '2026-11-11' and visibility = 'public'
  group by start_time
) as tpl
-- `waves` has no unique (date, start_time), so a re-run must not double up.
where not exists (
  select 1 from waves w where w.date = d::date and w.start_time = tpl.start_time
);
