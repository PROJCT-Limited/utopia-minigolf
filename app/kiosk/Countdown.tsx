"use client";

import { useEffect, useState } from "react";
import { COUNTDOWN_FROM } from "@/lib/scoring/kioskScenes";
import { playCueSound } from "./cueSounds";
import styles from "./kiosk.module.css";

/**
 * Three, two, one — the beat before the results.
 *
 * It exists to make the group look up. A scoreboard that simply changed into
 * a winner would be missed by four of the five people standing there; three
 * seconds of counting is enough for everyone to turn around, and it's the
 * only thing on this screen all day that deliberately withholds something.
 */
export function Countdown() {
  const [count, setCount] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    playCueSound("tick");
    const interval = setInterval(() => {
      setCount((current) => {
        const next = current - 1;
        if (next > 0) playCueSound("tick");
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span key={count} className={styles.countdown} aria-hidden>
      {Math.max(1, count)}
    </span>
  );
}
