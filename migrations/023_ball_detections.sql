-- =============================================================================
-- Raw RFID events streamed by relay/rfid_to_supabase.py from the Java
-- ScoreServer aggregator. The relay intentionally stays "dumb" — it only
-- writes antenna-port metadata; player resolution happens at read time in
-- the kiosk by JOINing against booking_players.ball_tag_id.
--
-- `role` was added in this migration so the kiosk can label each arrival
-- as the start-gate or end-gate of its station. Legacy rows (written by
-- the relay before role was emitted) keep role=NULL and are skipped by
-- the kiosk renderer.
--
-- Run this in the Supabase SQL editor (same convention as
-- 001_schema.sql line 4). Re-runs are safe: every statement is guarded.
-- =============================================================================

create table if not exists ball_detections (
  id              uuid primary key default gen_random_uuid(),
  epc             text not null,
  station_number  int  not null check (station_number between 1 and 5),
  ant             int  not null,
  rssi            int,
  role            text,
  detected_at     timestamptz not null
);

-- Add the check as a separate statement; if a legacy row had an unexpected
-- role value the user can inspect with `select distinct role from
-- ball_detections;` before retrying.
alter table ball_detections
  drop constraint if exists ball_detections_role_check;
alter table ball_detections
  add constraint ball_detections_role_check
    check (role is null or role in ('start','end'));

-- Two indexes cover the kiosk's read patterns:
--   (epc, detected_at desc)         — per-player timeline at a station
--   (station_number, detected_at desc) — operator triage over a window
create index if not exists ball_detections_epc_detected_idx
  on ball_detections (epc, detected_at desc);
create index if not exists ball_detections_station_detected_idx
  on ball_detections (station_number, detected_at desc);

-- Same posture as 014_scoring.sql lines 55-57: default-deny RLS, all
-- reads/writes go through the service-role client in lib/supabase/admin.ts
-- which bypasses RLS (the kiosk page is public/unauthenticated).
alter table ball_detections enable row level security;
