// FILE: lib/booking/slotRules.ts
// -----------------------------------------------------------------------------
// Which start times the booking picker lets a ticket choose. Pure and
// client-safe, so the picker and the tests read the same rule; the server
// enforces the same thing through ticketRuleError() in pricing.ts.
// -----------------------------------------------------------------------------

import { FAMILY_SLOT_NOTE } from "./copy";
import { isStartTimeAllowedFor, type TicketType } from "./pricing";
import type { SlotRule } from "./waves";

/** The family ticket's one restriction on start times: early only. */
const FAMILY_SLOT_RULE: SlotRule = {
  allows: (wave) => isStartTimeAllowedFor("family", wave.startTime),
  note: FAMILY_SLOT_NOTE,
  label: "Unavailable",
};

export function slotRuleFor(ticketType: TicketType | null): SlotRule | null {
  return ticketType === "family" ? FAMILY_SLOT_RULE : null;
}
