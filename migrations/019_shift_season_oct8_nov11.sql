-- =============================================================================
-- FOUND — the season moves: 30 Sept – 31 Oct 2026 becomes 8 Oct – 11 Nov 2026.
--
-- The code side is already done: BOOKABLE_WINDOW_START/END in
-- lib/booking/waves.ts now read 2026-10-08 / 2026-11-11, so the booking UI
-- stops offering anything outside that range the moment it deploys. This file
-- brings the `waves` table into line with it:
--
--   * 8–31 Oct already exists (the old window covered it) and is left
--     untouched, bookings and hand-tuned capacities included.
--   * 1–11 Nov is created in the same shape as the rest of the season.
--   * 30 Sept – 7 Oct is dropped — but only where nothing is booked against it.
--
-- Unlike 011, this is NOT a blanket wipe: the database has live bookings now.
-- Any dropped-range start time with a booking on it survives this migration,
-- and the SELECT at the bottom lists exactly those so staff can move the
-- guests by hand (admin → the start time → reschedule) before deleting the
-- leftovers. Nobody new can book those dates in the meantime — they're
-- outside the window the app queries. If `sessions` still exists in this
-- database (i.e. 016 was never run) and holds a row against one of these
-- waves, the delete fails on its foreign key and the whole transaction rolls
-- back, which is the correct outcome: nothing is half-applied.
--
-- Run this in the Supabase SQL editor, after 018_checkin.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- November inherits October's shape rather than repeating 011's literals —
-- start times, group counts and people caps are all copied from the days
-- already open, so any capacity an admin tuned since 011 carries into the new
-- days instead of being silently reset to the defaults. mode() picks the
-- typical configuration per start time, so one edited evening can't skew it.
-- -----------------------------------------------------------------------------
do $$
declare template_rows int;
begin
  select count(distinct start_time) into template_rows
  from waves where date between '2026-10-08' and '2026-10-31';

  if template_rows = 0 then
    raise exception
      'No waves between 2026-10-08 and 2026-10-31 to copy November from — run 011 first, or this database is not what this migration expects.';
  end if;
end $$;

insert into waves (date, start_time, total_wave_slots, wave_slots_used, status, people_capacity, people_used)
select
  d::date,
  tpl.start_time,
  tpl.total_wave_slots,
  0,
  'confirmed',
  tpl.people_capacity,
  0
from generate_series('2026-11-01'::date, '2026-11-11'::date, '1 day'::interval) as d
cross join (
  select
    start_time,
    mode() within group (order by total_wave_slots) as total_wave_slots,
    mode() within group (order by people_capacity)  as people_capacity
  from waves
  where date between '2026-10-08' and '2026-10-31'
  group by start_time
) as tpl
-- `waves` has no unique (date, start_time), so re-running this file must not
-- double up the November evenings.
where not exists (
  select 1 from waves w where w.date = d::date and w.start_time = tpl.start_time
);

-- -----------------------------------------------------------------------------
-- The eight days that fell off the front of the season. Booked ones stay;
-- everything else goes.
-- -----------------------------------------------------------------------------
delete from waves w
where w.date between '2026-09-30' and '2026-10-07'
  and not exists (select 1 from bookings b where b.wave_id = w.id);

commit;

-- -----------------------------------------------------------------------------
-- What's left to deal with by hand. Empty result = the shift is complete.
-- Each row is a guest holding a booking on a date FOUND is no longer open.
-- -----------------------------------------------------------------------------
select
  w.date,
  w.start_time,
  b.status,
  b.lead_name,
  b.lead_email,
  b.headcount,
  b.manage_token
from waves w
join bookings b on b.wave_id = w.id
where w.date between '2026-09-30' and '2026-10-07'
order by w.date, w.start_time;
