"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDaySoldOutAction } from "@/lib/admin/waveActions";
import styles from "./admin.module.css";

/**
 * Sells out or reopens the evening currently being looked at. Shown only when
 * the list is narrowed to a single date, because that's the only time "this
 * day" means anything.
 */
export function DaySoldOutButton({
  date,
  openCount,
  soldOutCount,
}: {
  date: string;
  /** Public start times still on sale that day. */
  openCount: number;
  /** Public start times already marked sold out. */
  soldOutCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (openCount === 0 && soldOutCount === 0) return null;

  // An evening with nothing left on sale is the one to offer reopening.
  const soldOut = openCount === 0;

  async function run(next: boolean) {
    setBusy(true);
    setError(null);
    const result = await setDaySoldOutAction(date, next);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.dayAction}>
      <button type="button" className="btn btn-outline" onClick={() => run(!soldOut)} disabled={busy}>
        {busy ? "Saving…" : soldOut ? "Reopen this evening" : "Mark evening sold out"}
      </button>
      <span className="hint">
        {soldOut
          ? `${soldOutCount} start ${soldOutCount === 1 ? "time" : "times"} showing as sold out to guests`
          : `${openCount} start ${openCount === 1 ? "time" : "times"} on sale`}
      </span>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
