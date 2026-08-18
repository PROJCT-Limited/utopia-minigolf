"use client";

import { useState } from "react";

const LEADERBOARD_TABS = [
  { key: "day", label: "Today" },
  { key: "month", label: "This month" },
  { key: "global", label: "All clubs" },
] as const;

type TabKey = (typeof LEADERBOARD_TABS)[number]["key"];

export function Leaderboard() {
  const [tab, setTab] = useState<TabKey>("day");

  return (
    <div className="board">
      <div className="tabs">
        {LEADERBOARD_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab${tab === t.key ? " on" : ""}`}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lbempty">
        <p>Scores will show up here once the first rounds are played.</p>
      </div>
    </div>
  );
}
