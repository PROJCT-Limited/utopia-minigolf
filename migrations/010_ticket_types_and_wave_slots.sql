-- =============================================================================
-- UTOPIA — ticket types (Standard / Unlimited) and the wave-slot capacity
-- model that replaces flat headcount-based capacity.
--
-- Previously `waves.capacity`/`waves.booked` counted raw people. The new
-- model counts discrete "groups" bookable at each quarter-hour start time —
-- one booking (regardless of ticket type) always consumes exactly 1 slot at
-- its specific start time; ticket type only changes the price and what's
-- included (one 30-min run vs the full hour with re-entry), never how many
-- slots it holds. Renaming the columns rather than reinterpreting them in
-- place, since silently changing what a column means without renaming it is
-- how future bugs happen.
-- =============================================================================

alter table waves rename column capacity to total_wave_slots;
alter table waves rename column booked to wave_slots_used;

alter table waves drop constraint waves_booked_within_capacity;
alter table waves add constraint waves_slots_used_within_total check (wave_slots_used <= total_wave_slots);

-- -----------------------------------------------------------------------------
-- bookings — which ticket type was bought. No slots_used column: every
-- booking holds exactly 1 slot regardless of ticket type, so there's nothing
-- to store beyond the type itself.
-- -----------------------------------------------------------------------------
alter table bookings
  add column ticket_type text not null default 'standard' check (ticket_type in ('standard', 'unlimited'));
alter table bookings alter column ticket_type drop default;

-- -----------------------------------------------------------------------------
-- sessions (public join-by-link) — the host picks one ticket type for the
-- whole session at creation time; every joiner plays under that same ticket
-- type. Physically one session is one group departing together and holds
-- exactly 1 slot, same as a private booking, regardless of ticket type.
-- -----------------------------------------------------------------------------
alter table sessions
  add column ticket_type text not null default 'standard' check (ticket_type in ('standard', 'unlimited'));
alter table sessions alter column ticket_type drop default;
