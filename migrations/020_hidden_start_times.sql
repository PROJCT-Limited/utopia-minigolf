-- =============================================================================
-- FOUND — unlisted start times.
--
-- Some evenings aren't for the public: an internal run-through, a private
-- hire, a block held for friends of the house. Those need to be bookable —
-- with the same payment, capacity and check-in machinery as everything else —
-- without ever appearing in the booking calendar.
--
-- Two columns do it:
--
--   visibility     'public' (listed, the default and what every existing row
--                  becomes) or 'hidden' (never returned by the public wave
--                  query, so it can't be browsed to, picked in the calendar,
--                  or landed on as a reschedule target).
--   private_token  the unguessable half of the link staff send out —
--                  /book/private/<token>. Set when a start time is hidden,
--                  cleared when it goes public again, and re-rollable from
--                  the admin panel if a link gets forwarded somewhere it
--                  shouldn't have been.
--
-- Hiding a start time is a listing decision, not an access-control one for
-- bookings already on it: an existing booking keeps working, keeps its manage
-- link, and still shows up at the door.
--
-- ORDERING MATTERS: run this BEFORE deploying the code that goes with it.
-- The public wave query selects and filters on `visibility` from the moment
-- that deploy lands (wavesRepo.fetchUpcomingWaves), and against a table
-- without the column every such query errors — which the booking page renders
-- as a calendar with nothing in it. Migration first, deploy second.
--
-- Run this in the Supabase SQL editor, after 019_shift_season_oct8_nov11.sql.
-- =============================================================================

alter table waves
  add column visibility text not null default 'public'
    check (visibility in ('public', 'hidden')),
  add column private_token text unique;

-- Every hidden start time must carry a token (that's the only way in), and a
-- public one must not keep a stale link alive.
alter table waves
  add constraint waves_private_token_matches_visibility check (
    (visibility = 'hidden' and private_token is not null) or
    (visibility = 'public' and private_token is null)
  );

-- The public booking query filters on this column on every page load.
create index waves_visibility_idx on waves (visibility);
