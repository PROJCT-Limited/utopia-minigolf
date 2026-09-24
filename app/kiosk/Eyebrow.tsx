"use client";

import styles from "./kiosk.module.css";

/**
 * The small mono label above every headline.
 *
 * Parts are set with space between them rather than a separator glyph —
 * the site's own labels ("WHAT'S INCLUDED", "WEEK OF SEP 28") never carry a
 * middot, and at 0.18em tracking the gap does the separating on its own.
 */
export function Eyebrow({ parts }: { parts: string[] }) {
  return (
    <span className={styles.eyebrow}>
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
    </span>
  );
}
