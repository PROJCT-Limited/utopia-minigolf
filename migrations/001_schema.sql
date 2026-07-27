-- =============================================================================
-- UTOPIA — Minigolf Social Club: core schema.
-- Postgres / Supabase. Money is stored as integer cents. Currency: HKD.
-- Run this in the Supabase SQL editor (or as a migration).
-- =============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()
create extension if not exists "citext";   -- case-insensitive email columns

-- -----------------------------------------------------------------------------
-- waves — a bookable time slot. Pre-launch, most rows are `provisional`: date
-- and start_time are placeholders and the booking UI shows "Opening soon —
-- reserve your place" instead of a real time. Admin flips a row to `confirmed`
-- and fills in the real date/time once the launch date is locked — no code
-- change needed anywhere that reads `status`.
-- -----------------------------------------------------------------------------
create table waves (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null,
  capacity    int not null check (capacity > 0),
  booked      int not null default 0 check (booked >= 0),
  status      text not null default 'provisional'
                check (status in ('provisional', 'confirmed', 'full')),
  created_at  timestamptz not null default now(),
  constraint waves_booked_within_capacity check (booked <= capacity)
);

create index waves_date_idx on waves (date);
create index waves_status_idx on waves (status);

-- -----------------------------------------------------------------------------
-- bookings — one paid reservation. `manage_token` is generated once at
-- creation and mailed once in the confirmation email; it's a permanent
-- lookup key (not a short-TTL token) for the self-serve /manage/[token] page,
-- valid until `reschedule_used` is set or the reschedule cutoff passes.
-- amount_paid_cents is ALWAYS server-computed at booking time — see
-- lib/booking/pricing.ts. The client-shown total is decoration only.
-- -----------------------------------------------------------------------------
create table bookings (
  id                       uuid primary key default gen_random_uuid(),
  wave_id                  uuid not null references waves(id),
  lead_name                text not null,
  lead_email               citext not null,
  party_type               text not null check (party_type in ('solo', 'pair', 'group')),
  headcount                int not null check (headcount between 1 and 4),
  amount_paid_cents        int not null check (amount_paid_cents >= 0),
  currency                 text not null default 'hkd',
  status                   text not null default 'pending'
                             check (status in ('pending', 'paid', 'cancelled')),
  stripe_payment_intent_id text unique,
  manage_token             text unique not null,
  reschedule_used          boolean not null default false,
  pair_opt_in              boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index bookings_wave_id_idx on bookings (wave_id);
create index bookings_manage_token_idx on bookings (manage_token);
create index bookings_lead_email_idx on bookings (lead_email);

-- -----------------------------------------------------------------------------
-- pairing_profiles — private, staff-only. Only collected when a solo/pair
-- guest opts in (18+ gated in the UI, enforced by `over_18` being required
-- here too). Never exposed to any public-facing query or to other guests —
-- no RLS policy below grants select/insert to anon/authenticated, so only the
-- service-role client (staff-side admin views) can ever read this table.
-- -----------------------------------------------------------------------------
create table pairing_profiles (
  booking_id  uuid primary key references bookings(id) on delete cascade,
  age_band    text,
  interests   text[] not null default '{}',
  bio         text,
  over_18     boolean not null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- subscribers — "get launch updates" capture, for people not ready to pay.
-- -----------------------------------------------------------------------------
create table subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       citext unique not null,
  name        text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- email_events — send-exactly-once bookkeeping for transactional email,
-- keyed by (booking_id, type). Mirrors the same table shape used elsewhere in
-- the PROJCT stack so lib/email/sendEmailOnce.ts works unmodified.
-- -----------------------------------------------------------------------------
create table email_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id),
  type        text not null,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_id text,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (booking_id, type)
);

-- -----------------------------------------------------------------------------
-- rate_limit_events — backs lib/rateLimit.ts. Postgres-backed (not in-memory)
-- because this app runs as stateless serverless functions; one row per
-- attempt, counted within a trailing window. Used for the notify-me capture
-- endpoint and admin login attempts.
-- -----------------------------------------------------------------------------
create table rate_limit_events (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null,
  key         text not null,
  created_at  timestamptz not null default now()
);

create index rate_limit_events_scope_key_idx on rate_limit_events (scope, key, created_at);

-- -----------------------------------------------------------------------------
-- Row-Level Security.
-- Every write in this app goes through the SERVICE-ROLE client (server
-- actions / route handlers), which bypasses RLS entirely — that's how the
-- trusted (server-recomputed) price, manage_token, and pairing data get
-- written. The policies below only govern what the public ANON key can do
-- directly from the browser, which for this app is: read wave availability.
-- Nothing else is publicly readable — bookings contain PII, pairing_profiles
-- is staff-only by design, subscribers and email_events are write-only via
-- the server.
-- -----------------------------------------------------------------------------
alter table waves              enable row level security;
alter table bookings           enable row level security;
alter table pairing_profiles   enable row level security;
alter table subscribers        enable row level security;
alter table email_events       enable row level security;
alter table rate_limit_events  enable row level security;

create policy "public reads waves"
  on waves for select
  using (true);

-- No policies on bookings, pairing_profiles, subscribers, email_events, or
-- rate_limit_events for anon/authenticated: default-deny. All access is via
-- supabaseAdmin.
