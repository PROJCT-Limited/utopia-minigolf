-- =============================================================================
-- FOUND — retire public sessions.
--
-- Public sessions (003_public_sessions.sql) were a second booking mode: a
-- host started a session against a wave, shared a link, and each joiner paid
-- for their own place. That mode is gone. A booking is now just a booking —
-- one person or a group of up to five, distinguished only by how many
-- tickets are bought — so `bookings` is the single path again.
--
-- Safe to run: at the time this was written the two tables held only test
-- rows (two @example.com participants plus one abandoned pending row), no
-- station_scores referenced a participant, and neither affected wave carried
-- any wave_slots_used. Verify that still holds before running — the SELECTs
-- at the bottom of this file are here for exactly that.
--
-- THIS IS DESTRUCTIVE AND IRREVERSIBLE. The application code no longer reads
-- or writes these tables, so it runs correctly whether or not this migration
-- has been applied — there is no rush.
--
-- Run this in the Supabase SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pre-flight. Every one of these should return 0 before you run the drops
-- below; anything else means real data is attached and this needs a rethink.
-- -----------------------------------------------------------------------------
-- select count(*) from station_scores where session_participant_id is not null;
-- select count(*) from session_participants where email not like '%@example.com';
-- select count(*) from sessions;

-- -----------------------------------------------------------------------------
-- station_scores: drop the session half of the "exactly one player" design,
-- leaving booking_player_id as the only way a score is attributed. The check
-- constraint has to go first — with the column gone its expression no longer
-- resolves — and is replaced by a plain NOT NULL, which is what "exactly one
-- player" degrades to once there's only one kind of player.
-- -----------------------------------------------------------------------------
alter table station_scores drop constraint if exists station_scores_exactly_one_player;
alter table station_scores drop constraint if exists station_scores_session_participant_station_key;
alter table station_scores drop column if exists session_participant_id;
alter table station_scores alter column booking_player_id set not null;

-- -----------------------------------------------------------------------------
-- The tables themselves. session_participants first — it has the FK to
-- sessions. RLS policies and indexes drop with their table.
-- -----------------------------------------------------------------------------
drop table if exists session_participants;
drop table if exists sessions;
