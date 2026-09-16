"use client";

import { useEffect } from "react";
import { clearWizardState } from "@/app/book/wizardState";

/**
 * Renders nothing; forgets the saved checkout.
 *
 * The wizard keeps a half-finished booking in sessionStorage so a reload
 * doesn't cost a guest their payment form (see app/book/wizardState.ts).
 * Arriving here means that booking is done — including when the guest lands
 * back from a bank's 3-D Secure page rather than from the wizard itself — so
 * this is the one place that reliably sees the end of the flow.
 */
export function ClearCheckoutState() {
  useEffect(() => {
    clearWizardState();
  }, []);

  return null;
}
