"use client";

import { useState } from "react";
import type { LeaderboardRow } from "@/lib/scoring/leaderboardRepo";
import styles from "../page.module.css";

const TABS = [
  { key: "day", label: "Today" },
  { key: "month", label: "This month" },
  { key: "global", label: "All clubs" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FoundLeaderboard({
  day,
  month,
  all,
}: {
  day: LeaderboardRow[];
  month: LeaderboardRow[];
  all: LeaderboardRow[];
}) {
  const [tab, setTab] = useState<TabKey>("day");
  const rowsByTab: Record<TabKey, LeaderboardRow[]> = { day, month, global: all };
  const rows = rowsByTab[tab];

  return (
    <div>
      <div className={styles.lbTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.lbTab} ${tab === t.key ? styles.lbTabActive : ""}`}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.lbRule} />
      {rows.length === 0 ? (
        <p className={styles.lbEmpty}>Scores will show up here once the first rounds are played.</p>
      ) : (
        <div className={styles.lbRows}>
          {rows.map((row) => (
            <div className={styles.lbRow} key={`${tab}-${row.rank}`}>
              <span className={styles.lbRank}>{row.rank}</span>
              <span className={styles.lbPlayer}>{row.player}</span>
              <span className={styles.lbContext}>{row.context}</span>
              <span className={styles.lbStrokes}>{row.strokes} strokes</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
