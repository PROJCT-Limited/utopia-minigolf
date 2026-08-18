-- =============================================================================
-- UTOPIA — correct the Sept 24–30 launch week's capacity: 5, not 12.
--
-- 007_open_prebooking_sept24_30.sql used capacity 12, matching the admin
-- "Add a slot" form's default — but one round is one group across the 5
-- stations (same constraint 005_confirmed_hourly_waves.sql's seed used),
-- so 12 was wrong. No bookings existed on these waves yet (checked before
-- running), so this is a safe in-place capacity change, not a reset.
--
-- Run this in the Supabase SQL editor.
-- =============================================================================

update waves
  set capacity = 5
  where date between '2026-09-24' and '2026-09-30';
