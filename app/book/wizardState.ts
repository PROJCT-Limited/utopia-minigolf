// FILE: app/book/wizardState.ts
// -----------------------------------------------------------------------------
// Keeps a half-finished booking across a page reload.
//
// Everything the wizard knew lived in React state, so any reload dropped a
// guest back at step 1 with their payment form gone — and on a phone a reload
// is not a rare event. Fetching an SMS code, taking a call, or leaving the tab
// while the card form loads is enough for iOS Safari to discard the page and
// reload it on return. The booking row survives that; the guest's place in the
// flow did not, and there was no way back to it.
//
// sessionStorage, not localStorage: this belongs to one tab and one sitting.
// It holds the PaymentIntent's client secret, which is a browser-side value by
// design (it can only confirm its own payment, and can't read anything), but
// there's still no reason for it to outlive the tab that's using it.
// -----------------------------------------------------------------------------

import type { TicketType } from "@/lib/booking/pricing";

const STORAGE_KEY = "found.booking.v1";

/**
 * How long a restored checkout is worth resuming. Long enough to survive a
 * phone call or a hunt for a card; short enough that tomorrow's visit starts
 * clean rather than resuming a booking the guest has forgotten making.
 */
const MAX_AGE_MS = 2 * 60 * 60_000;

export interface StoredWizardState {
  savedAt: number;
  step: number;
  ticketType: TicketType | null;
  headcount: number;
  selectedWaveId: string | null;
  partySettled: boolean;
  leadName: string;
  leadEmail: string;
  payment: { bookingId: string; clientSecret: string } | null;
}

export function saveWizardState(state: Omit<StoredWizardState, "savedAt">): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    // Private mode, a full quota, storage disabled by policy. Persistence is
    // an improvement on losing everything, never a requirement for booking.
  }
}

export function clearWizardState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
}

/**
 * Reads back a saved checkout, or null if there isn't a usable one. Anything
 * malformed, stale, or from another shape of this object is discarded rather
 * than half-applied.
 */
export function loadWizardState(): StoredWizardState | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredWizardState>;
    if (typeof parsed?.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearWizardState();
      return null;
    }
    if (typeof parsed.step !== "number" || parsed.step < 1 || parsed.step > 4) return null;

    return {
      savedAt: parsed.savedAt,
      step: parsed.step,
      ticketType: parsed.ticketType ?? null,
      headcount: typeof parsed.headcount === "number" ? parsed.headcount : 1,
      selectedWaveId: parsed.selectedWaveId ?? null,
      partySettled: parsed.partySettled ?? false,
      leadName: parsed.leadName ?? "",
      leadEmail: parsed.leadEmail ?? "",
      payment: parsed.payment ?? null,
    };
  } catch {
    clearWizardState();
    return null;
  }
}
