-- =============================================================================
-- FOUND — remove the pre-launch test days.
--
-- Four days sit in `waves` from before the season was set: 31 Aug, 8 Sept,
-- 9 Sept and 10 Sept 2026. They're fixtures — seeded start times carrying
-- @example.com bookings ("Your Test Group", "Sam Wu", "Benson") with kiosk
-- scores attached from testing. None of them ever reached Stripe. They're
-- outside the booking window so no guest can see them, but they're the first
-- thing staff meet at the top of the admin list, which is reason enough.
--
-- SCOPED BY AN EXPLICIT DATE LIST, not a range, so it cannot widen to
-- anything real. In particular it does NOT touch 30 Sept, 1 Oct or 5 Oct:
-- every booking on those days has a Stripe payment intent behind it (one of
-- them paid), which makes them payment records rather than fixtures. Those
-- need a deliberate decision, not a cleanup script.
--
-- Order matters: email_events first (its foreign key has no cascade), then
-- bookings — which cascades into pairing_profiles and booking_players, and
-- from booking_players into station_scores — then the waves themselves.
--
-- DESTRUCTIVE AND IRREVERSIBLE. The pre-flight below is the safety catch: it
-- aborts the whole transaction if any booking on these days has ever been to
-- Stripe.
--
-- Run this in the Supabase SQL editor, after 020_hidden_start_times.sql.
-- =============================================================================

begin;

-- Pre-flight. Anything with a payment intent is not a fixture — stop rather
-- than destroy the record of a charge.
do $$
declare stripe_backed int;
begin
  select count(*) into stripe_backed
  from bookings b
  join waves w on w.id = b.wave_id
  where w.date in ('2026-08-31', '2026-09-08', '2026-09-09', '2026-09-10')
    and b.stripe_payment_intent_id is not null;

  if stripe_backed > 0 then
    raise exception
      'ABORT: % booking(s) on these days have Stripe payment intents — not test data.', stripe_backed;
  end if;
end $$;

delete from email_events
where booking_id in (
  select b.id from bookings b
  join waves w on w.id = b.wave_id
  where w.date in ('2026-08-31', '2026-09-08', '2026-09-09', '2026-09-10')
);

-- Cascades into pairing_profiles and booking_players; booking_players
-- cascades on into station_scores.
delete from bookings
where wave_id in (
  select id from waves
  where date in ('2026-08-31', '2026-09-08', '2026-09-09', '2026-09-10')
);

delete from waves
where date in ('2026-08-31', '2026-09-08', '2026-09-09', '2026-09-10');

commit;

-- Verification. Both counts should be 0, and the earliest date left should be
-- 2026-09-30 — the Stripe-backed leftovers this file deliberately spares.
select
  (select count(*) from waves
    where date in ('2026-08-31', '2026-09-08', '2026-09-09', '2026-09-10')) as test_day_waves,
  (select count(*) from station_scores s
     left join booking_players p on p.id = s.booking_player_id
    where p.id is null) as orphaned_scores,
  (select min(date) from waves) as earliest_remaining_date;
