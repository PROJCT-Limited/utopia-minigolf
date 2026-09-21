import { Fragment } from "react";
import Link from "next/link";
import { listWavesForAdmin } from "@/lib/admin/waves";
import {
  WAVE_FILTERS,
  WAVE_FILTER_LABELS,
  filterWaves,
  groupWavesByDate,
  isWaveFilter,
  summarizeDayLoad,
  type WaveFilter,
} from "@/lib/admin/dayLoad";
import { PEOPLE_PER_START_TIME } from "@/lib/booking/capacityConfig";
import { formatWaveDate } from "../utils/formatWave";
import { AdminShell } from "./AdminShell";
import { CreateWaveForm } from "./CreateWaveForm";
import { DaySoldOutButton } from "./DaySoldOutButton";
import styles from "./admin.module.css";

export const metadata = { title: "Start times — FOUND Admin" };
export const dynamic = "force-dynamic";

function formatDayHeading(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; date?: string }>;
}) {
  const { show, date } = await searchParams;
  const filter: WaveFilter = isWaveFilter(show) ? show : "all";

  const allWaves = await listWavesForAdmin();
  // A day picked in the calendar narrows everything below it — including the
  // filter counts, which should describe what's on screen and not the season.
  const scoped = date ? allWaves.filter((w) => w.date === date) : allWaves;
  const days = groupWavesByDate(filterWaves(scoped, filter));
  const dayLoads = summarizeDayLoad(scoped);

  const counts = Object.fromEntries(
    WAVE_FILTERS.map((f) => [f, filterWaves(scoped, f).length])
  ) as Record<WaveFilter, number>;

  function filterHref(next: WaveFilter): string {
    const params = new URLSearchParams();
    if (next !== "all") params.set("show", next);
    if (date) params.set("date", date);
    const query = params.toString();
    return query ? `/admin?${query}` : "/admin";
  }

  return (
    <AdminShell
      active="waves"
      title="Start times"
      subtitle={
        date ? (
          <>
            {formatDayHeading(date)} ·{" "}
            <Link href={filter === "all" ? "/admin" : `/admin?show=${filter}`}>show the whole season</Link>
          </>
        ) : (
          `${allWaves.length} across the season`
        )
      }
    >
      {/* Selling out a whole evening is a day-level act, so it lives here,
          where the list is already narrowed to one. */}
      {date && (
        <DaySoldOutButton
          date={date}
          openCount={scoped.filter((w) => !w.isHidden && w.status !== "full").length}
          soldOutCount={scoped.filter((w) => !w.isHidden && w.status === "full").length}
        />
      )}

      <div className={styles.filterBar} role="group" aria-label="Filter start times">
        {WAVE_FILTERS.map((f) => (
          <Link
            key={f}
            href={filterHref(f)}
            className={`${styles.filterChip} ${f === filter ? styles.filterChipOn : ""}`}
            aria-current={f === filter ? "true" : undefined}
          >
            {WAVE_FILTER_LABELS[f]}
            <span className={styles.filterCount}>{counts[f]}</span>
          </Link>
        ))}
      </div>

      {days.length > 0 && (
        <table className={styles.table}>
          {/* One table for the whole list rather than one per day: the columns
              then line up down the page, and a day costs a single heading row
              instead of repeating the column header every time. */}
          {/* Three columns, not five. Every start time in the season is
              "confirmed", so a status column meant 853 identical badges —
              status now shows only when it's something other than that. Group
              counts went the same way: capacity is people, so people is the
              number staff act on, and the meter makes a column of them
              scannable without reading a single figure. */}
          <colgroup>
            <col className={styles.colTime} />
            <col className={styles.colPeople} />
            <col className={styles.colManage} />
          </colgroup>
          <thead>
            <tr>
              <th>Time</th>
              <th>People</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {days.map(({ date: day, waves }) => {
              const load = dayLoads.get(day);
              return (
                <Fragment key={day}>
                  <tr className={styles.dayRow}>
                    <th scope="colgroup">{formatDayHeading(day)}</th>
                    {/* Only what the rows below don't already say. The day's
                        people total lived here too, next to a column of the
                        same figure — what's left is the pair of things a row
                        can't show: checkouts nobody finished, and start times
                        that aren't publicly listed. */}
                    <td colSpan={2} className={styles.dayFigures}>
                      {load && load.pendingPeople > 0 && (
                        <span className={styles.pendingNote}>{load.pendingPeople} mid-checkout</span>
                      )}
                      {load && load.pendingPeople > 0 && load.hiddenCount > 0 && " · "}
                      {load && load.hiddenCount > 0 && (
                        <span className={styles.hiddenNote}>{load.hiddenCount} unlisted</span>
                      )}
                    </td>
                  </tr>

                  {waves.map((w) => {
                    const rowClass = [
                      w.paidBookingCount > 0 ? styles.rowBooked : styles.rowFree,
                      w.isHidden ? styles.rowHidden : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const filled = w.peopleCapacity > 0 ? (w.paidPeopleCount / w.peopleCapacity) * 100 : 0;

                    return (
                      <tr key={w.id} className={rowClass}>
                        <td className={styles.timeCell}>
                          {w.status === "provisional" ? "TBC" : w.startTime.slice(0, 5)}
                          {w.isHidden && <span className={styles.unlistedTag}>Unlisted</span>}
                          {w.status !== "confirmed" && (
                            <span className={`${styles.badge} ${styles[w.status] ?? ""}`}>{w.status}</span>
                          )}
                        </td>
                        <td>
                          {/* Flex lives on this wrapper, not on the cell: a
                              flex <td> stops behaving like a table cell and
                              its bottom border stops lining up with the rest
                              of the row. */}
                          <div className={styles.peopleCell}>
                          <span className={styles.meter} aria-hidden>
                            <span className={styles.meterFill} style={{ width: `${filled}%` }} />
                          </span>
                          <span className={styles.peopleFigure}>
                            {w.paidPeopleCount > 0 ? (
                              <>
                                <strong>{w.paidPeopleCount}</strong> of {w.peopleCapacity}
                              </>
                            ) : (
                              <span className={styles.peopleEmpty}>0 of {w.peopleCapacity}</span>
                            )}
                          </span>
                          {w.pendingBookingCount > 0 && (
                            <span className={styles.pendingNote}>+{w.pendingPeopleCount} mid-checkout</span>
                          )}
                          {w.capacityCounterDrift && (
                            <span
                              className={styles.drift}
                              title="The people counter that gates booking disagrees with the paid bookings behind it."
                            >
                              counter: {w.peopleUsed}
                            </span>
                          )}
                          </div>
                        </td>
                        <td className={styles.manageCell}>
                          <Link href={`/admin/waves/${w.id}`}>Manage →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {days.length === 0 && (
        <p className={styles.emptyNote}>
          Nothing matches this filter{date ? ` on ${formatWaveDate(date)}` : ""}.
        </p>
      )}

      <details className={`${styles.card} ${styles.addCard}`}>
        <summary className={styles.addSummary}>Add a start time</summary>
        <div className={styles.addBody}>
          <CreateWaveForm defaultPeopleCapacity={PEOPLE_PER_START_TIME} />
        </div>
      </details>
    </AdminShell>
  );
}
