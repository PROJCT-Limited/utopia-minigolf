-- =============================================================================
-- UTOPIA — seed data: provisional waves for local dev / staging.
-- All dates/times/capacities here are placeholders (per the brief, exact dates
-- are unconfirmed at site launch) — swap for real rows via the admin panel
-- once the launch date is locked. Safe to skip in production; only needed so
-- the booking UI has something to render locally.
-- =============================================================================

insert into waves (date, start_time, capacity, status)
select
  d::date,
  t::time,
  12,
  'provisional'
from generate_series('2026-09-05'::date, '2026-11-28'::date, '7 days'::interval) as d
cross join (values ('10:00'), ('11:30'), ('13:00'), ('14:30'), ('16:00'), ('17:30')) as times(t);

-- A couple of rows nudged toward "almost full" / "full" so the capacity UI
-- (spots left / sold out states) has something to show without a real booking.
update waves set booked = capacity - 2
  where date = '2026-09-05' and start_time = '11:30';
update waves set booked = capacity, status = 'full'
  where date = '2026-09-05' and start_time = '13:00';
