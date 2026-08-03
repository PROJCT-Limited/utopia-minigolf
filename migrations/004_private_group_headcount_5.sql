-- =============================================================================
-- UTOPIA — raise the private-group booking cap from 4 to 5.
--
-- The booking wizard no longer asks guests to choose solo/pair/group — it's
-- just a headcount now (lib/booking/pricing.ts's derivePartyTypeFromHeadcount
-- still stores party_type for admin/email display, but it's derived, not a
-- guest choice). Capped at 5 to match the public-session max_players ceiling.
-- =============================================================================

alter table bookings drop constraint bookings_headcount_check;
alter table bookings add constraint bookings_headcount_check check (headcount between 1 and 5);
