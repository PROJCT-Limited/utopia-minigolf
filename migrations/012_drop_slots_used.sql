-- =============================================================================
-- UTOPIA — drop `slots_used` from bookings and sessions.
--
-- 010_ticket_types_and_wave_slots.sql was already run against this database
-- in its original form (slots_used int not null, weighted by ticket type)
-- before the brief changed: every booking now holds exactly 1 slot
-- regardless of ticket type, so there's nothing left for this column to
-- store. The migration file on disk was edited in place to match (since
-- nothing had gone live *at the time*), but that edit doesn't retroactively
-- undo what was already applied here — hence this corrective migration.
--
-- Run this in the Supabase SQL editor.
-- =============================================================================

alter table bookings drop column slots_used;
alter table sessions drop column slots_used;
