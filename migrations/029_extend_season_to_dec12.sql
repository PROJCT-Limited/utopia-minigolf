-- =============================================================================
-- FOUND — the season now runs 7 Nov – 12 Dec 2026.
--
-- BOOKABLE_WINDOW_END in lib/booking/waves.ts now reads 2026-12-12. This file
-- creates 11–12 Dec in the same shape as the rest of the season: start times,
-- group counts and people caps are copied from 7 Nov – 10 Dec (mode() per
-- start time, as in 019, 025 and 026). Those days already open at 17:00 (028),
-- so the copy carries no 4pm start times.
--
-- Run this in the Supabase SQL editor, after 028_open_at_5pm.sql.
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
from generate_series('2026-12-11'::date, '2026-12-12'::date, '1 day'::interval) as d
cross join (
  select
    start_time,
    mode() within group (order by total_wave_slots) as total_wave_slots,
    mode() within group (order by people_capacity)  as people_capacity
  from waves
  where date between '2026-11-07' and '2026-12-10' and visibility = 'public'
  group by start_time
) as tpl
-- `waves` has no unique (date, start_time), so a re-run must not double up.
where not exists (
  select 1 from waves w where w.date = d::date and w.start_time = tpl.start_time
);
