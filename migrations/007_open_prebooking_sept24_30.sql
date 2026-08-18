-- =============================================================================
-- UTOPIA — open real prebooking for the first launch week: Sep 24–30, 2026,
-- hourly rounds 12:00–20:00 (9 slots/day, capacity 12), status confirmed.
-- Price is unaffected — HKD 160 is hardcoded globally in
-- lib/booking/pricing.ts; this window is being marketed as the "early bird"
-- price via UI copy only (see app/page.tsx), not a separate DB rate.
--
-- Scoped only to 2026-09-24..2026-09-30 — every other date's rows are left
-- untouched. Re-runnable: clears out anything already in this date range
-- (and cascades to any bookings/sessions/participants/email_events resting
-- on those rows) before inserting the fresh confirmed schedule, so it's safe
-- to run again if the times/capacity need adjusting later.
--
-- Run this in the Supabase SQL editor.
-- =============================================================================

delete from email_events
  where booking_id in (
    select id from bookings where wave_id in (
      select id from waves where date between '2026-09-24' and '2026-09-30'
    )
  );

delete from session_participants
  where session_id in (
    select id from sessions where wave_id in (
      select id from waves where date between '2026-09-24' and '2026-09-30'
    )
  );

delete from sessions
  where wave_id in (
    select id from waves where date between '2026-09-24' and '2026-09-30'
  );

delete from bookings
  where wave_id in (
    select id from waves where date between '2026-09-24' and '2026-09-30'
  );

delete from waves where date between '2026-09-24' and '2026-09-30';

insert into waves (date, start_time, capacity, booked, status)
select
  d::date,
  t::time,
  12,
  0,
  'confirmed'
from generate_series('2026-09-24'::date, '2026-09-30'::date, '1 day'::interval) as d
cross join (
  values ('12:00'), ('13:00'), ('14:00'), ('15:00'), ('16:00'),
         ('17:00'), ('18:00'), ('19:00'), ('20:00')
) as times(t);
