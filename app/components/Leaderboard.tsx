"use client";

import { useState } from "react";

interface LeaderboardRow {
  rank: number;
  player: string;
  context: string;
  strokes: number;
  parDiff: number;
}

const LEADERBOARD_TABS = [
  { key: "day", label: "Today" },
  { key: "month", label: "This month" },
  { key: "global", label: "All clubs" },
] as const;

type TabKey = (typeof LEADERBOARD_TABS)[number]["key"];

const LEADERBOARD_ROWS: Record<TabKey, LeaderboardRow[]> = {
  day: [
    { rank: 1, player: "Marta K.", context: "10:00, Morning wave", strokes: 8, parDiff: -4 },
    { rank: 2, player: "Julien R.", context: "11:30, Late morning", strokes: 9, parDiff: -3 },
    { rank: 3, player: "Priya S.", context: "10:00, Morning wave", strokes: 9, parDiff: -3 },
    { rank: 4, player: "Tom B.", context: "14:30, Afternoon", strokes: 10, parDiff: -2 },
  ],
  month: [
    { rank: 1, player: "Sofia M.", context: "4 Sep", strokes: 7, parDiff: -5 },
    { rank: 2, player: "Marta K.", context: "12 Sep", strokes: 8, parDiff: -4 },
    { rank: 3, player: "Dan O.", context: "9 Sep", strokes: 8, parDiff: -4 },
    { rank: 4, player: "Leo P.", context: "2 Sep", strokes: 9, parDiff: -3 },
  ],
  global: [
    { rank: 1, player: "K. Tanaka", context: "PROJCT Tokyo", strokes: 6, parDiff: -6 },
    { rank: 2, player: "Sofia M.", context: "UTOPIA Hong Kong", strokes: 7, parDiff: -5 },
    { rank: 3, player: "W. Chan", context: "PROJCT Singapore", strokes: 7, parDiff: -5 },
    { rank: 4, player: "M. Silva", context: "PROJCT Sydney", strokes: 8, parDiff: -4 },
  ],
};

function formatPar(diff: number): string {
  if (diff === 0) return "Par";
  return diff < 0 ? `${diff}` : `+${diff}`;
}

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
      <div className="lbrows">
        {LEADERBOARD_ROWS[tab].map((row) => (
          <div className={`lbrow${row.rank === 1 ? " lead" : ""}`} key={`${tab}-${row.rank}`}>
            <span className="rk">{row.rank}</span>
            <span className="pl">{row.player}</span>
            <span className="ctx">{row.context}</span>
            <span className="str">{row.strokes} str</span>
            <span className="par">{formatPar(row.parDiff)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
