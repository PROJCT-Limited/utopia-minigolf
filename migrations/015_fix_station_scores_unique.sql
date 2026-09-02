-- =============================================================================
-- UTOPIA — fix station_scores' upsert conflict target.
--
-- 014_scoring.sql used partial unique indexes ("where ... is not null") so
-- the booking-side and session-side uniqueness rules wouldn't collide. That
-- broke every upsert: Postgres only lets ON CONFLICT target a partial index
-- if the conflict clause repeats its WHERE predicate, which PostgREST's
-- upsert (Supabase's .upsert({ onConflict: "col1,col2" })) has no way to
-- express — every write failed with "no unique or exclusion constraint
-- matching the ON CONFLICT specification".
--
-- The partial WHERE was never actually necessary: Postgres unique
-- constraints already treat NULL as never equal to NULL, so plain (non-
-- partial) unique constraints on these two column pairs behave identically
-- for our purposes (rows with a NULL booking_player_id — i.e. every
-- session-based score — never conflict with each other on that column
-- alone) while being a real constraint ON CONFLICT can target directly.
--
-- Run this in the Supabase SQL editor.
-- =============================================================================

drop index if exists station_scores_booking_player_station_idx;
drop index if exists station_scores_session_participant_station_idx;

alter table station_scores
  add constraint station_scores_booking_player_station_key unique (booking_player_id, station_number);
alter table station_scores
  add constraint station_scores_session_participant_station_key unique (session_participant_id, station_number);
