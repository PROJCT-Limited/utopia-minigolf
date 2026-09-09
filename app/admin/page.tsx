import Link from "next/link";
import { listWavesForAdmin } from "@/lib/admin/waves";
import { PEOPLE_PER_START_TIME } from "@/lib/booking/capacityConfig";
import { formatWaveDate } from "../utils/formatWave";
import { CreateWaveForm } from "./CreateWaveForm";
import styles from "./admin.module.css";

export const metadata = { title: "Admin — FOUND" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const waves = await listWavesForAdmin();

  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.headRow}>
        <div>
          <span className="lbl">FOUND Admin</span>
          <h1 className={styles.title}>Start times</h1>
        </div>
        <div className={styles.headLinks}>
          <Link href="/checkin" className="hint">
            Check in →
          </Link>
          <Link href="/admin/partners" className="hint">
            Partners →
          </Link>
        </div>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Add a start time</h3>
        <CreateWaveForm defaultPeopleCapacity={PEOPLE_PER_START_TIME} />
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Groups</th>
              <th>People</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {waves.map((w) => (
              <tr key={w.id}>
                <td>{formatWaveDate(w.date)}</td>
                <td>{w.status === "provisional" ? "TBC" : w.startTime.slice(0, 5)}</td>
                <td>
                  <span className={`${styles.badge} ${styles[w.status] ?? ""}`}>{w.status}</span>
                </td>
                <td>{w.paidBookingCount}</td>
                <td>
                  {w.paidPeopleCount} / {w.peopleCapacity}
                  {w.capacityCounterDrift && (
                    <>
                      {" "}
                      <span className={styles.drift} title="The people counter that gates booking disagrees with the paid bookings behind it.">
                        counter: {w.peopleUsed}
                      </span>
                    </>
                  )}
                </td>
                <td>
                  <Link href={`/admin/waves/${w.id}`}>Manage →</Link>
                </td>
              </tr>
            ))}
            {waves.length === 0 && (
              <tr>
                <td colSpan={6}>No start times yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
