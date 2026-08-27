-- =============================================================================
-- UTOPIA — replace the entire booking window with the real operating model:
-- Sept 30 - Oct 31, 2026 inclusive, nothing outside that range. Open every
-- day, 16:00-22:00. Bookable start times fall on quarter-hour marks only
-- (:00, :15, :30, :45), first start 16:00, last start 21:45 (that group's
-- 30 min + turnover clears by ~22:20). Each 30-minute block holds 5 groups,
-- split :00->3, :15->2, :30->3, :45->2 — capacity alternates by quarter, not
-- a flat number. All confirmed (real hours are known for this whole window,
-- nothing provisional).
--
-- DESTRUCTIVE, but verified safe: as of this migration, `bookings`,
-- `sessions`, `session_participants`, and `email_events` are all empty, and
-- every existing `waves` row is pre-launch data with zero real payments
-- (Stripe is still in test mode). This fully replaces the previous hourly
-- Sept 24-30 window.
--
-- Run this in the Supabase SQL editor, after 010_ticket_types_and_wave_slots.sql.
-- =============================================================================

delete from email_events;
delete from session_participants;
delete from sessions;
delete from bookings;
delete from waves;

insert into waves (date, start_time, total_wave_slots, wave_slots_used, status)
select
  d::date,
  t::time,
  case when extract(minute from t) in (0, 30) then 3 else 2 end,
  0,
  'confirmed'
from generate_series('2026-09-30'::date, '2026-10-31'::date, '1 day'::interval) as d
cross join generate_series(
  '2000-01-01 16:00'::timestamp,
  '2000-01-01 21:45'::timestamp,
  '15 minutes'::interval
) as t;
