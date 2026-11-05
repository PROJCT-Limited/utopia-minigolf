import { FLOOR_PLAN_SVG } from "./floorPlanSvg";
import styles from "./FloorPlan.module.css";

/** The venue floor plan: five stations, bar, scoreboard, desk, queue, club return. */
export function FloorPlan({ className }: { className?: string }) {
  return (
    <div
      className={`${styles.plan} ${className ?? ""}`}
      // A static, checked-in asset (see floorPlanSvg.ts) — never user input.
      dangerouslySetInnerHTML={{ __html: FLOOR_PLAN_SVG }}
    />
  );
}

const LEGEND: { mark: string; label: string }[] = [
  { mark: "1", label: "Station numbers 1–5" },
  { mark: "W", label: "Waiting zone" },
  { mark: "R", label: "Registration desk" },
  { mark: "B", label: "Bar + seating" },
  { mark: "S", label: "Scoreboard" },
  { mark: "←", label: "Return clubs" },
];

/**
 * The key to the floor plan. `layout="row"` lays it out in a line (wrapping)
 * for under a wide map; the default is a column.
 */
export function FloorPlanLegend({ layout = "column", className }: { layout?: "column" | "row"; className?: string }) {
  return (
    <ul className={`${styles.legend} ${layout === "row" ? styles.legendRow : ""} ${className ?? ""}`}>
      {LEGEND.map(({ mark, label }) => (
        <li key={label} className={styles.legendItem}>
          <span className={styles.mark} aria-hidden>
            {mark}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
