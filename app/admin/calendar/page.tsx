import Link from "next/link";
import { listWavesForAdmin } from "@/lib/admin/waves";
import { busiestDayPeople, loadLevel, summarizeDayLoad, type DayLoad } from "@/lib/admin/dayLoad";
import { BOOKABLE_WINDOW_END, BOOKABLE_WINDOW_START, monthGridDays, shiftMonthKey } from "@/lib/booking/waves";
import { formatMonthLabel } from "../../utils/formatWave";
import { AdminShell } from "../AdminShell";
import styles from "../admin.module.css";

export const metadata = { title: "Calendar — FOUND Admin" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isMonthKey(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

/**
 * Which month to open on. The season if we're in it, otherwise the month it
 * starts in — deliberately not "the earliest month that has waves", which is
 * how this landed on an empty August: `waves` still holds stray pre-launch
 * test days, and the calendar opened on one of them.
 */
function defaultMonth(): string {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const seasonStart = BOOKABLE_WINDOW_START.slice(0, 7);
  const seasonEnd = BOOKABLE_WINDOW_END.slice(0, 7);

  return thisMonth >= seasonStart && thisMonth <= seasonEnd ? thisMonth : seasonStart;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const waves = await listWavesForAdmin();
  const dayLoads = summarizeDayLoad(waves);

  const viewMonth = isMonthKey(month) ? month : defaultMonth();
  const cells = monthGridDays(viewMonth);

  const monthDays = [...dayLoads.values()].filter((d) => d.date.startsWith(viewMonth));
  // Shading is relative to the busiest day of the whole season, not of this
  // month, so paging between months compares like with like.
  const busiest = busiestDayPeople(dayLoads.values());

  const monthPeople = monthDays.reduce((sum, d) => sum + d.peopleBooked, 0);
  const monthGroups = monthDays.reduce((sum, d) => sum + d.groupsBooked, 0);
  const monthCapacity = monthDays.reduce((sum, d) => sum + d.peopleCapacity, 0);

  return (
    <AdminShell
      active="calendar"
      title="Calendar"
      subtitle="Every day of the season, shaded by how much business it's holding. Click a day for its start times."
    >
      <div className={styles.card}>
        <div className={styles.calHead}>
          <Link
            href={`/admin/calendar?month=${shiftMonthKey(viewMonth, -1)}`}
            className={styles.calNav}
            aria-label="Previous month"
          >
            ‹
          </Link>
          <div className={styles.calMonth}>
            <span className={styles.calMonthLabel}>{formatMonthLabel(viewMonth)}</span>
            <span className="hint">
              {monthGroups} {monthGroups === 1 ? "group" : "groups"} · {monthPeople} of {monthCapacity} places sold
            </span>
          </div>
          <Link
            href={`/admin/calendar?month=${shiftMonthKey(viewMonth, 1)}`}
            className={styles.calNav}
            aria-label="Next month"
          >
            ›
          </Link>
        </div>

        <div className={styles.calWeekdays} aria-hidden>
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className={styles.calGrid}>
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} className={styles.calPad} />;

            const load = dayLoads.get(date);
            if (!load) {
              return (
                <div key={date} className={`${styles.calCell} ${styles.calClosed}`}>
                  <span className={styles.calDay}>{Number(date.slice(-2))}</span>
                  <span className={styles.calClosedNote}>Closed</span>
                </div>
              );
            }

            return (
              <Link
                key={date}
                href={`/admin?date=${date}`}
                className={`${styles.calCell} ${styles[`level${loadLevel(load.peopleBooked, busiest)}`]}`}
              >
                <span className={styles.calDay}>{Number(date.slice(-2))}</span>
                <CellFigures load={load} />
              </Link>
            );
          })}
        </div>

        <div className={styles.calLegend}>
          <span className="hint">Quieter</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`${styles.legendSwatch} ${styles[`level${level}`]}`} />
          ))}
          <span className="hint">Busiest day so far ({busiest || 0} people)</span>
        </div>
      </div>
    </AdminShell>
  );
}

function CellFigures({ load }: { load: DayLoad }) {
  if (load.peopleBooked === 0) {
    return (
      <span className={styles.calEmpty}>
        {load.pendingPeople > 0 ? `${load.pendingPeople} mid-checkout` : "—"}
        {load.hiddenCount > 0 && <span className={styles.calHidden}> · {load.hiddenCount} unlisted</span>}
      </span>
    );
  }

  return (
    <span className={styles.calFigures}>
      <span className={styles.calPeople}>{load.peopleBooked}</span>
      <span className={styles.calPeopleUnit}>{load.peopleBooked === 1 ? "person" : "people"}</span>
      <span className={styles.calGroups}>
        {load.groupsBooked} {load.groupsBooked === 1 ? "group" : "groups"} · {load.bookedStartTimeCount}/
        {load.startTimeCount} slots
      </span>
      {(load.pendingPeople > 0 || load.hiddenCount > 0) && (
        <span className={styles.calMarks}>
          {load.pendingPeople > 0 && <span>+{load.pendingPeople} mid-checkout</span>}
          {load.hiddenCount > 0 && <span className={styles.calHidden}>{load.hiddenCount} unlisted</span>}
        </span>
      )}
    </span>
  );
}
