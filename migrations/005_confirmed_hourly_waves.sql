-- =============================================================================
-- UTOPIA — replace the provisional placeholder schedule with a real,
-- confirmed one: every day, hourly from 12:00 to 22:00 (11 waves/day),
-- capacity 5 (one round = one HOKA-fitted group across the 5 stations).
--
-- DESTRUCTIVE: this deletes every existing wave and everything attached to
-- it (bookings, session participants, sessions, and their email_events).
-- Everything in the database right now is pre-launch test data (there are
-- no real customers yet), so this is a clean reset, not data loss of
-- anything that matters. Do not run this once the app has real bookings.
--
-- Date range mirrors the old seed's window (Sep 5 – Nov 28, 2026) — adjust
-- the generate_series bounds below if that's not the right run of dates.
-- =============================================================================

delete from email_events;
delete from session_participants;
delete from sessions;
delete from bookings;
delete from waves;

insert into waves (date, start_time, capacity, booked, status)
select
  d::date,
  t::time,
  5,
  0,
  'confirmed'
from generate_series('2026-09-05'::date, '2026-11-28'::date, '1 day'::interval) as d
cross join (
  values ('12:00'), ('13:00'), ('14:00'), ('15:00'), ('16:00'),
         ('17:00'), ('18:00'), ('19:00'), ('20:00'), ('21:00'), ('22:00')
) as times(t);
