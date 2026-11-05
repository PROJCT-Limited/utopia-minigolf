import Link from "next/link";
import {
  SIGNUP_COLUMNS,
  SIGNUP_FILTERS,
  SIGNUP_FILTER_LABELS,
  fetchSignups,
  filterSignups,
  isSignupFilter,
  type SignupFilter,
} from "@/lib/admin/signups";
import { AdminShell } from "../AdminShell";
import styles from "../admin.module.css";

export const metadata = { title: "Sign-ups — FOUND Admin" };
export const dynamic = "force-dynamic";

function filterHref(filter: SignupFilter): string {
  return filter === "all" ? "/admin/signups" : `/admin/signups?show=${filter}`;
}

export default async function SignupsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter: SignupFilter = isSignupFilter(show) ? show : "all";

  const all = await fetchSignups();
  const rows = filterSignups(all, filter);
  const counts = Object.fromEntries(SIGNUP_FILTERS.map((f) => [f, filterSignups(all, f).length])) as Record<
    SignupFilter,
    number
  >;
  const exportHref = filter === "all" ? "/api/admin/signups/export" : `/api/admin/signups/export?show=${filter}`;

  return (
    <AdminShell
      active="signups"
      title="Sign-ups"
      subtitle="Launch-update sign-ups and paid bookings, newest first. Times are Hong Kong time."
    >
      <div className={styles.filterBar} role="group" aria-label="Filter sign-ups">
        {SIGNUP_FILTERS.map((f) => (
          <Link
            key={f}
            href={filterHref(f)}
            className={`${styles.filterChip} ${f === filter ? styles.filterChipOn : ""}`}
            aria-current={f === filter ? "true" : undefined}
          >
            {SIGNUP_FILTER_LABELS[f]}
            <span className={styles.filterCount}>{counts[f]}</span>
          </Link>
        ))}
        <a href={exportHref} className={styles.filterChip}>
          Export CSV
        </a>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              {SIGNUP_COLUMNS.map((col) => (
                <th key={col.id}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {SIGNUP_COLUMNS.map((col) => (
                  <td key={col.id}>{col.display(row)}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={SIGNUP_COLUMNS.length}>
                  {filter === "today" ? "No sign-ups yet today." : "No sign-ups yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
