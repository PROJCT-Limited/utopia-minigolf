-- =============================================================================
-- UTOPIA — partner/affiliate tracking links. A partner's link (?ref=hoka)
-- carries no customer discount — it exists purely so bookings can be
-- credited to the partner and commission calculated automatically (paid out
-- manually, offline). See proxy.ts for click capture and cookie handling,
-- lib/partners/ for the read/write logic.
-- =============================================================================

create table partners (
  id               uuid primary key default gen_random_uuid(),
  ref_code         text unique not null,             -- e.g. "hoka", "marta" — the ?ref= value
  name             text not null,
  commission_rate  numeric not null default 0.05 check (commission_rate >= 0 and commission_rate <= 1),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- partner_clicks — one row per qualifying page request carrying ?ref=, not a
-- running counter, so the admin report can filter "clicks in range" for
-- monthly settlement. Logged only for known, active ref codes (see proxy.ts).
-- -----------------------------------------------------------------------------
create table partner_clicks (
  id          uuid primary key default gen_random_uuid(),
  ref_code    text not null references partners(ref_code) on delete cascade,
  clicked_at  timestamptz not null default now()
);

create index partner_clicks_ref_code_idx on partner_clicks (ref_code, clicked_at);

-- -----------------------------------------------------------------------------
-- referred_by — the partner (if any) whose link this guest arrived through.
-- Nullable: most bookings have no referrer. Set once at booking-creation time
-- (same pre-payment-write pattern as ticket_type), never touched afterward.
-- `on delete set null` so a removed partner never breaks a past booking.
-- -----------------------------------------------------------------------------
alter table bookings add column referred_by text references partners(ref_code) on delete set null;
alter table session_participants add column referred_by text references partners(ref_code) on delete set null;

-- -----------------------------------------------------------------------------
-- Row-Level Security — same default-deny posture as the rest of this schema.
-- Only the service-role client (server actions / proxy.ts) ever reads or
-- writes these tables.
-- -----------------------------------------------------------------------------
alter table partners        enable row level security;
alter table partner_clicks  enable row level security;
