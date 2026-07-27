import Link from "next/link";
import { listWavesForAdmin } from "@/lib/admin/waves";
import { formatWaveDate } from "../utils/formatWave";
import { CreateWaveForm } from "./CreateWaveForm";
import styles from "./admin.module.css";

export const metadata = { title: "Admin — UTOPIA" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const waves = await listWavesForAdmin();

  return (
    <main className={`wrap ${styles.page}`}>
      <div className={styles.headRow}>
        <div>
          <span className="lbl">UTOPIA Admin</span>
          <h1 className={styles.title}>Waves</h1>
        </div>
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Add a wave</h3>
        <CreateWaveForm />
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Capacity</th>
              <th>Paid bookings</th>
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
                <td>
                  {w.booked} / {w.capacity}
                </td>
                <td>{w.paidBookingCount}</td>
                <td>
                  <Link href={`/admin/waves/${w.id}`}>Manage →</Link>
                </td>
              </tr>
            ))}
            {waves.length === 0 && (
              <tr>
                <td colSpan={6}>No waves yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
