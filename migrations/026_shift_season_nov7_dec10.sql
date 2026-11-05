-- =============================================================================
-- FOUND — the season is now 7 Nov – 10 Dec 2026.
--
-- BOOKABLE_WINDOW_START / BOOKABLE_WINDOW_END in lib/booking/waves.ts now read
-- 2026-11-07 / 2026-12-10. 7–22 Nov already exist; this file creates
-- 23 Nov – 10 Dec in the same shape: start times, group counts and people
-- caps are copied from 7–22 Nov (mode() per start time, as in 019 and 025),
-- so a hand-tuned evening can't skew them.
--
-- Nothing is deleted. Start times before 7 Nov stay in the table with their
-- bookings untouched — the window just stops fetching or offering them. As of
-- 2026-11-04 no paid booking sits on any date from 5 Nov on; the one booking
-- there is an unpaid, abandoned checkout on 22 Nov, which is inside the new
-- season anyway.
--
-- Run this in the Supabase SQL editor, after 025_extend_season_to_nov22.sql.
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
from generate_series('2026-11-23'::date, '2026-12-10'::date, '1 day'::interval) as d
cross join (
  select
    start_time,
    mode() within group (order by total_wave_slots) as total_wave_slots,
    mode() within group (order by people_capacity)  as people_capacity
  from waves
  where date between '2026-11-07' and '2026-11-22' and visibility = 'public'
  group by start_time
) as tpl
-- `waves` has no unique (date, start_time), so a re-run must not double up.
where not exists (
  select 1 from waves w where w.date = d::date and w.start_time = tpl.start_time
);
