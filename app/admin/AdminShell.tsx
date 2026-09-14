import Link from "next/link";
import styles from "./admin.module.css";

/**
 * The admin panel's frame: left-hand tabs, then whatever the page is.
 *
 * `active` is passed in rather than read from usePathname() so this stays a
 * server component — the nav is four links and a heading, and making the
 * whole shell client-side to highlight one of them would ship JS for nothing.
 *
 * Deliberately not a route layout: /admin/login lives under the same segment
 * and must not be wrapped in navigation to pages nobody signed in can open.
 */

export type AdminTab = "calendar" | "waves" | "partners" | "checkin";

// Labels only. Each tab briefly carried a line of grey explanation beneath
// it — "Season at a glance", "Referral codes" — which restated the label
// without adding anything to it, and doubled the height of the nav to do so.
const TABS: { id: AdminTab; href: string; label: string }[] = [
  { id: "calendar", href: "/admin/calendar", label: "Calendar" },
  { id: "waves", href: "/admin", label: "Start times" },
  { id: "partners", href: "/admin/partners", label: "Partners" },
  { id: "checkin", href: "/checkin", label: "Check in" },
];

export function AdminShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: AdminTab;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.shell}>
        <nav className={styles.sidebar} aria-label="Admin sections">
          <span className="lbl">FOUND Admin</span>
          <ul className={styles.tabs}>
            {TABS.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  className={`${styles.tab} ${tab.id === active ? styles.tabOn : ""}`}
                  aria-current={tab.id === active ? "page" : undefined}
                >
                  <span className={styles.tabLabel}>{tab.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className={styles.content}>
          <div className={styles.headRow}>
            <div>
              <h1 className={styles.title}>{title}</h1>
              {subtitle && <p className="hint">{subtitle}</p>}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
