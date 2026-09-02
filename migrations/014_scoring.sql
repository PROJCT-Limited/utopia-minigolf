-- =============================================================================
-- UTOPIA — on-site scoring kiosk. Players self-serve their own stroke counts
-- per station on an iPad at the venue. See lib/scoring/ for the app-side
-- logic, app/kiosk/ for the UI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- booking_players — per-player roster for a PRIVATE booking, captured once
-- at first kiosk check-in (bookings only ever store the lead booker's name +
-- a headcount, never individual player names). Public sessions don't need
-- this — session_participants already has one row per named player.
-- -----------------------------------------------------------------------------
create table booking_players (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index booking_players_booking_id_idx on booking_players (booking_id);
create unique index booking_players_booking_id_name_idx on booking_players (booking_id, lower(name));

-- -----------------------------------------------------------------------------
-- station_scores — one row per player per station (1-5). Exactly one of the
-- two player-reference columns is set, mirroring this schema's existing
-- pattern of parallel (not unified) private-booking vs. public-session
-- columns — same as ticket_type/referred_by/manage_token already being
-- duplicated across bookings and session_participants rather than merged
-- into one shared "player" concept.
-- -----------------------------------------------------------------------------
create table station_scores (
  id                      uuid primary key default gen_random_uuid(),
  booking_player_id       uuid references booking_players(id) on delete cascade,
  session_participant_id  uuid references session_participants(id) on delete cascade,
  station_number          int not null check (station_number between 1 and 5),
  strokes                 int not null check (strokes between 1 and 20),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint station_scores_exactly_one_player check (
    (booking_player_id is not null)::int + (session_participant_id is not null)::int = 1
  )
);

create unique index station_scores_booking_player_station_idx
  on station_scores (booking_player_id, station_number) where booking_player_id is not null;
create unique index station_scores_session_participant_station_idx
  on station_scores (session_participant_id, station_number) where session_participant_id is not null;

-- -----------------------------------------------------------------------------
-- Row-Level Security — same default-deny posture as the rest of this schema.
-- The kiosk page is public/unauthenticated by design (same as the booking
-- flow), but all writes still go through Server Actions using the
-- service-role client, never direct client access.
-- -----------------------------------------------------------------------------
alter table booking_players  enable row level security;
alter table station_scores   enable row level security;
