-- =============================================================================
-- UTOPIA — public sessions, and retiring solo pairing.
--
-- Public sessions are a second booking mode alongside `bookings` (private
-- groups): a host starts a session against a wave and shares a link, and
-- anyone with that link joins and pays for their own single HKD 160 place,
-- up to `max_players`. `waves.booked` keeps working as the single capacity
-- counter for a wave — both bookings and session participants increment it
-- once paid, exactly the same way, so wave availability never needs to know
-- which booking mode is consuming it.
--
-- Solo pairing (the opt-in age band / interests / bio / 18+ matching
-- attached to solo and pair bookings) is retired outright, not just hidden
-- in the UI — its table and the booking column that opted into it are
-- dropped here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sessions — a public, link-only join session against one wave. Discoverable
-- only via `share_token` (unguessable, same generation as bookings'
-- manage_token) — there is deliberately no query path that lists sessions to
-- an anonymous caller. `status` flips to 'full' once paid participants hit
-- `max_players` or the wave itself fills; there is no minimum-player
-- requirement or cancellation — a session with as few as 1 paid participant
-- is a normal, valid session.
-- -----------------------------------------------------------------------------
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  wave_id      uuid not null references waves(id),
  max_players  int not null default 5 check (max_players > 0),
  share_token  text unique not null,
  status       text not null default 'open' check (status in ('open', 'full')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index sessions_wave_id_idx on sessions (wave_id);
create index sessions_share_token_idx on sessions (share_token);

-- -----------------------------------------------------------------------------
-- session_participants — one paid place within a session. The host is just
-- the first participant (`is_host`), created (pending) at the same time as
-- the session itself; every other row is created when someone joins via the
-- share link. `manage_token` mirrors bookings.manage_token — mailed once,
-- permanent lookup key for /manage/[token] — so a participant can look up
-- their own place the same way a lead booker does.
--
-- `email_sent` is deliberately a plain per-row flag rather than reusing
-- email_events: each participant only ever gets exactly one transactional
-- email (the host's "share your link" or a joiner's "you're in" — mutually
-- exclusive by `is_host`), so there's no (id, type) dimension to key on, and
-- email_events.booking_id has a hard FK to bookings(id) that a participant
-- id can't satisfy.
-- -----------------------------------------------------------------------------
create table session_participants (
  id                       uuid primary key default gen_random_uuid(),
  session_id               uuid not null references sessions(id),
  name                     text not null,
  email                    citext not null,
  amount_paid_cents        int not null check (amount_paid_cents >= 0),
  currency                 text not null default 'hkd',
  status                   text not null default 'pending'
                             check (status in ('pending', 'paid', 'cancelled')),
  stripe_payment_intent_id text unique,
  manage_token             text unique not null,
  is_host                  boolean not null default false,
  email_sent               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index session_participants_session_id_idx on session_participants (session_id);
create index session_participants_manage_token_idx on session_participants (manage_token);

-- -----------------------------------------------------------------------------
-- Retire solo pairing entirely.
-- -----------------------------------------------------------------------------
drop table pairing_profiles;
alter table bookings drop column pair_opt_in;

-- -----------------------------------------------------------------------------
-- Row-Level Security — same default-deny posture as bookings: all reads and
-- writes go through the service-role client (server actions / route
-- handlers). No anon/authenticated policies here on purpose, matching the
-- rest of 001_schema.sql's comment on this.
-- -----------------------------------------------------------------------------
alter table sessions              enable row level security;
alter table session_participants  enable row level security;
