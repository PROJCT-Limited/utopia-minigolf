-- =============================================================================
-- FOUND — open daily 5–10pm from 7 Nov.
--
-- 019, 025 and 026 copied the 16:00–21:45 grid onto every day of the season.
-- The venue now opens at 17:00, so the four 4pm start times (16:00, 16:15,
-- 16:30, 16:45) come off sale on 7 Nov – 10 Dec. 21:45 stays the last start.
--
-- They're deleted rather than marked sold out, so the picker doesn't show an
-- hour of "Sold out" before opening. Only rows with no booking of any kind
-- (paid, pending or cancelled) go: as of 2026-11-05 none of them has one, and
-- the guard below keeps it that way if one is made before this runs.
--
-- To bring a 4pm start time back, re-run the insert in 026 with the date range
-- and start_time you want.
--
-- Run this in the Supabase SQL editor, after 027_family_ticket.sql.
-- =============================================================================

delete from waves w
where w.date between '2026-11-07' and '2026-12-10'
  and w.start_time < '17:00'
  and w.visibility = 'public'
  and not exists (select 1 from bookings b where b.wave_id = w.id);

-- Check: should return 0 rows. Any row here has a booking on it and was
-- left alone; deal with that booking first.
-- select date, start_time from waves
-- where date between '2026-11-07' and '2026-12-10' and start_time < '17:00'
-- order by date, start_time;
