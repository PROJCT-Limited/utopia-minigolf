"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./PersistentProjctTab.module.css";

// Fixed, on every page. Desktop: sits at the right screen edge, slides out on
// hover/focus to reveal the PROJCT link. Mobile: collapsed at the bottom,
// slides up on tap (":hover" doesn't fire on touch, so `open` state drives it
// there instead). The `open` class also lets keyboard users open it without
// relying on :hover at all.
export function PersistentProjctTab() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.wrap} ${open ? styles.open : ""}`}>
      <div className={styles.panel}>
        <Link href="/about" className={styles.link} onClick={() => setOpen(false)}>
          A venture built by PROJCT — see what else we make →
        </Link>
      </div>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-label={open ? "Close the PROJCT panel" : "Open the PROJCT panel"}
        onClick={() => setOpen((v) => !v)}
      >
        <img src="/projct-logo-blue.svg" alt="PROJCT" className={styles.mark} width={64} height={13} />
      </button>
    </div>
  );
}
