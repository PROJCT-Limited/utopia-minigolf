// FILE: app/book/reportCheckoutEvent.ts
// -----------------------------------------------------------------------------
// Tells the server a checkout went wrong in the browser.
//
// sendBeacon rather than fetch: a guest who gives up closes the tab, and a
// normal request dies with the page it was made from — which is exactly the
// moment worth hearing about. sendBeacon hands the payload to the browser to
// deliver whether or not the page survives.
//
// Nothing here is allowed to affect the checkout. Every failure path is
// swallowed: a report that throws while a guest is trying to pay would be a
// worse bug than the one it's reporting.
// -----------------------------------------------------------------------------

import type { CheckoutEventType } from "@/lib/booking/checkoutEvents";

export function reportCheckoutEvent(
  type: CheckoutEventType,
  { bookingId, detail }: { bookingId?: string; detail?: string } = {}
): void {
  try {
    const payload = JSON.stringify({ type, bookingId, detail });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // Blob rather than a bare string so the request carries a JSON content
      // type; sendBeacon sends text/plain otherwise, which the route's
      // req.json() would still parse, but only by accident.
      navigator.sendBeacon("/api/checkout-events", new Blob([payload], { type: "application/json" }));
      return;
    }

    // Older Safari: keepalive does the same job for a page that's going away.
    void fetch("/api/checkout-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting is best-effort, always.
  }
}
