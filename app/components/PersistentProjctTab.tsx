"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PersistentProjctTab.module.css";

// Fixed, on every page. Desktop: sits at the right screen edge, slides out on
// hover/focus to reveal the PROJCT link. Mobile: collapsed at the bottom,
// slides up on tap (":hover" doesn't fire on touch, so `open` state drives it
// there instead). The `open` class also lets keyboard users open it without
// relying on :hover at all.
//
// The logo tab comes first (in the DOM and visually) and stays pinned to the
// screen edge; the link text follows, clipped away at rest via `overflow:
// hidden` + an animated width/height on `.wrap`, rather than a transform —
// that's what lets the logo hold the edge while collapsed and hand that
// edge-flush spot to the text once expanded.
// The venue tablets are appliances, not pages: a marketing link out of the
// app is a wrong turn taken mid-round on a device that gets handed around,
// and PROJCT's cobalt is the one thing on those screens that isn't the FOUND
// palette. Everywhere else the tab stays.
const APPLIANCE_ROUTES = ["/kiosk", "/checkin"];

// Checkout is the other place it doesn't belong, for a plainer reason: the
// tab is fixed to the right edge at 36px wide with z-index 200, and at phone
// width the booking column's right edge is only 20px from the screen, so it
// lands on top of the full-width Pay button. A tap near that end opens a
// marketing panel instead of paying.
const CHECKOUT_ROUTES = ["/book"];

const HIDDEN_ROUTES = [...APPLIANCE_ROUTES, ...CHECKOUT_ROUTES];

export function PersistentProjctTab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <div className={`${styles.wrap} ${open ? styles.open : ""}`}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-label={open ? "Close the PROJCT panel" : "Open the PROJCT panel"}
        onClick={() => setOpen((v) => !v)}
      >
        {/* alt="" — the button's aria-label already names it, avoid double-announcing */}
        <img src="/projct-logo-blue.svg" alt="" className={styles.mark} width={56} height={12} />
      </button>
      <Link href="/about" className={styles.link} onClick={() => setOpen(false)}>
        A venture built by PROJCT. See what else we make →
      </Link>
    </div>
  );
}
