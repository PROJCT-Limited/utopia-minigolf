-- =============================================================================
-- UTOPIA — two fixes discovered after opening the Sept 24–30 window:
--
-- 1. An older migration (005_confirmed_hourly_waves.sql) had already
--    confirmed EVERY wave from Sep 5 through Nov 28, 2026 — not just the
--    Sep 24–30 launch week. 007 only touched the Sep 24–30 slice, so the
--    other 78 days were showing real bookable times too. This reverts every
--    wave outside Sep 24–30 back to `provisional`, so the booking UI shows
--    "Opening soon — reserve your place" for them again and only the launch
--    week has concrete times. Non-destructive: no rows are deleted, only
--    `status` changes.
--
-- 2. Pre-existing Stripe *test-mode* QA data on 2026-09-05: 1 pending
--    (unpaid) private booking, 7 public sessions with 7 paid participants.
--    Deleting these and rolling back the `booked` counters they incremented
--    on their waves.
--
-- Run this in the Supabase SQL editor.
-- =============================================================================

-- ---- (2) clean up 2026-09-05 QA data ----

delete from session_participants
  where session_id in (
    select id from sessions where wave_id in (
      select id from waves where date = '2026-09-05'
    )
  );

delete from sessions
  where wave_id in (
    select id from waves where date = '2026-09-05'
  );

delete from bookings
  where wave_id in (
    select id from waves where date = '2026-09-05'
  );

update waves set booked = 0 where date = '2026-09-05';

-- ---- (1) revert every wave outside the Sep 24–30 launch week ----

update waves
  set status = 'provisional'
  where date < '2026-09-24' or date > '2026-09-30';
