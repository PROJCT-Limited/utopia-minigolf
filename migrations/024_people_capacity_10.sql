-- =============================================================================
-- FOUND — a start time holds 10 people, not 15.
--
-- We have 15 golf balls. With a new start time every 15 minutes, groups from
-- neighbouring start times overlap on the course, so 15 per start time would
-- need more balls than exist. 10 per start time keeps the floor within them.
--
-- Lowers every start time still sitting on the old default. A cap an admin
-- tuned by hand (anything other than 15) is left alone. The column default
-- follows, for rows inserted outside the app (the app passes
-- PEOPLE_PER_START_TIME from lib/booking/capacityConfig.ts explicitly).
--
-- Checked against prod before writing: no start time has more than 10 people
-- paid, so waves_people_used_within_capacity (017) can't trip. If it does on a
-- re-run, that start time is overbooked and needs a decision, not a clamp.
--
-- Run this in the Supabase SQL editor, after 023_ball_detections.sql.
-- =============================================================================

alter table waves alter column people_capacity set default 10;

update waves
set people_capacity = 10
where people_capacity = 15;

-- A start time that already holds exactly 10 is now full. reserveSeats() only
-- flips status on the booking that fills it, so do it here for existing rows.
update waves
set status = 'full'
where status = 'confirmed' and people_used >= people_capacity;
