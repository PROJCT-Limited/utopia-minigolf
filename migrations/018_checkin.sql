-- =============================================================================
-- FOUND — door check-in.
--
-- Until now a group's players were first named at the scoring kiosk, mid-
-- round, and nothing tied a player to the physical ball they were putting
-- with. The stations are meant to stay dumb — scan a ball, log a stroke — so
-- the ball-to-name link has to be created once, by a human, before play:
-- that's the check-in tablet at the door (app/checkin/, lib/checkin/).
--
-- What this adds:
--   * bookings   — attendance (who actually turned up, and when), and a
--                  `source` that separates door walk-ins from paid-online
--                  bookings
--   * booking_players — the ball tag linked to each player, plus the optional
--                  email the door can collect
--
-- Run this in the Supabase SQL editor, after 017_people_capacity.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- bookings — attendance is deliberately kept apart from `headcount`.
-- `headcount` is what was sold and what capacity was charged for; it must not
-- move when three of a booked four turn up. `present_headcount` is what the
-- door confirmed, it drives how many players get registered, and it is null
-- until someone is checked in.
--
-- `source` exists because a walk-in booking is a real bookings row with no
-- Stripe payment behind it: staff took the money at the door, outside this
-- system. amount_paid_cents on those rows is the tariff owed (computed the
-- same way as online), never a confirmed Stripe capture — filter on `source`
-- before treating bookings revenue as reconciled.
-- -----------------------------------------------------------------------------
alter table bookings
  add column checked_in_at     timestamptz,
  add column present_headcount int check (present_headcount between 1 and 5),
  add column source            text not null default 'online'
                                 check (source in ('online', 'walk_in'));

-- A walk-in gives a name at the door, not always an email — and there's no
-- confirmation mail to send them, since they're already standing here.
alter table bookings alter column lead_email drop not null;
alter table bookings
  add constraint bookings_online_has_email
    check (source = 'walk_in' or lead_email is not null);

create index bookings_source_idx on bookings (source);

-- -----------------------------------------------------------------------------
-- booking_players — one row per person actually playing. `name` was already
-- here (the kiosk's roster step wrote it); check-in now writes it earlier and
-- adds the ball.
--
-- A ball is physical and comes back: the same tag is handed out again a few
-- slots later, so uniqueness can't be global or per-day. It's per *live
-- assignment* — the partial index below lets tag "A2" exist on many rows over
-- time but on only one un-released row at a time, which is exactly the rule
-- staff care about ("this ball is currently someone else's"). Check-in
-- auto-releases an assignment whose round has finished and refuses one whose
-- round is still on (see lib/checkin/checkinRepo.ts).
-- -----------------------------------------------------------------------------
alter table booking_players
  add column email            citext,
  add column ball_tag_id      text,
  add column ball_linked_at   timestamptz,
  add column ball_released_at timestamptz;

create unique index booking_players_active_ball_tag_idx
  on booking_players (ball_tag_id)
  where ball_tag_id is not null and ball_released_at is null;

-- Station tablets resolve a scanned tag straight to a player; that lookup is
-- the same one check-in uses to detect a double-linked ball.
create index booking_players_ball_tag_idx on booking_players (ball_tag_id);
