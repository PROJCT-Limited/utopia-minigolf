-- =============================================================================
-- FOUND — record checkouts that fail in the browser.
--
-- Two guests got stuck on the card page on 15 September and nothing anywhere
-- explained it. Stripe was no help by design: all three failed intents sat at
-- requires_payment_method with no last_payment_error, because no card was ever
-- submitted. Across this account's whole history not one card attempt has ever
-- been declined — every failure happens before Stripe is involved, which is
-- precisely the region nothing was watching.
--
-- So the browser says something now. One row per event: the card form didn't
-- load, a confirmation came back with an error, an intent came back
-- unfinished, someone opened a resume link. Written by
-- /api/checkout-events from a sendBeacon, read by staff in the admin panel
-- and counted in the nightly digest.
--
-- What it deliberately does NOT hold: no name, no email, no card detail, no
-- IP. A type, an optional booking id, a short detail string (a Stripe error
-- code or an intent status), and the user agent — which is the one field that
-- distinguishes "a phone on venue wifi" from "a desktop with a blocker", the
-- question that was unanswerable last time.
--
-- Run this in the Supabase SQL editor, after 021_remove_pre_season_test_days.sql.
-- =============================================================================

create table checkout_events (
  id          uuid primary key default gen_random_uuid(),
  -- Null when the failure happened before a booking existed. Cascades so
  -- clearing test bookings doesn't leave orphans behind.
  booking_id  uuid references bookings(id) on delete cascade,
  type        text not null
                check (type in (
                  'stripe_js_failed',
                  'stripe_js_slow',
                  'confirm_error',
                  'intent_unfinished',
                  'resume_opened'
                )),
  -- A Stripe error code, an intent status, or nothing. Never free text from
  -- a guest, and capped so a malformed client can't write an essay.
  detail      text check (detail is null or length(detail) <= 300),
  user_agent  text check (user_agent is null or length(user_agent) <= 400),
  created_at  timestamptz not null default now()
);

create index checkout_events_created_at_idx on checkout_events (created_at desc);
create index checkout_events_booking_id_idx on checkout_events (booking_id);

-- Same posture as every other table here: RLS on, no policies, so only the
-- service-role client (the API route and the admin views) can read or write.
alter table checkout_events enable row level security;
