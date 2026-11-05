-- =============================================================================
-- FOUND — the family ticket.
--
-- A third ticket type: 2 adults (18+) and 2 to 4 children (3 to 11), one
-- round, daytime only. Additive — existing bookings are untouched:
--
--   * bookings.ticket_type may now be 'family'.
--   * bookings.adults_count / children_count record a family's split. Null
--     on every other ticket, and on every booking made before this file.
--   * bookings_family_party holds the split together: a family is exactly 2
--     adults and 2 to 4 children, and headcount = adults + children. Every
--     other ticket keeps its old 1 to 5 limit, so a party of 6 is only ever a
--     family. (The app reads a family's split off headcount on that basis —
--     see familyParty() in lib/booking/pricing.ts.)
--   * headcount and present_headcount go up to 6, for the largest family.
--
-- The 17:00 daytime cut-off is NOT in the database: it's FAMILY_STARTS_BEFORE
-- in lib/booking/pricing.ts, checked when a booking is made and rescheduled,
-- while the daytime hours are still being decided.
--
-- Run this in the Supabase SQL editor, after 026_shift_season_nov7_dec10.sql.
-- =============================================================================

-- The old ticket_type, headcount and present_headcount checks were created
-- without explicit names in 004, 010 and 018. Drop them by what they check
-- rather than by a guessed name, so this can't silently leave the 1 to 5 cap
-- in place.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'bookings'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%ticket_type%' or pg_get_constraintdef(oid) ilike '%headcount%')
  loop
    execute format('alter table bookings drop constraint %I', c.conname);
  end loop;
end $$;

alter table bookings
  add column if not exists adults_count   int,
  add column if not exists children_count int;

alter table bookings
  add constraint bookings_ticket_type_check
    check (ticket_type in ('standard', 'unlimited', 'family')),
  add constraint bookings_headcount_check
    check (headcount between 1 and 6),
  add constraint bookings_present_headcount_check
    check (present_headcount between 1 and 6),
  add constraint bookings_family_party check (
    case
      when ticket_type = 'family' then
        adults_count = 2
        and children_count between 2 and 4
        and headcount = adults_count + children_count
      else
        adults_count is null
        and children_count is null
        and headcount between 1 and 5
    end
  );

-- Check: should list the four constraints above and nothing else that
-- mentions headcount or ticket_type.
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'bookings'::regclass and contype = 'c';
