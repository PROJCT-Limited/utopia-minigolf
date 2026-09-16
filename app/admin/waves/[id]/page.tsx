import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchWaveAdminDetail } from "@/lib/admin/waves";
import { privateBookingUrl } from "@/lib/admin/privateLink";
import { TICKET_TYPE_LABELS } from "@/lib/booking/pricing";
import { AdminShell } from "../../AdminShell";
import { AdminWaveForm } from "./AdminWaveForm";
import { PrivateLinkCard } from "./PrivateLinkCard";
import styles from "../../admin.module.css";

export const metadata = { title: "Manage start time — FOUND Admin" };
export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-HK", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default async function AdminWaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchWaveAdminDetail(id);
  if (!detail) notFound();

  const { wave, privateToken, bookings, paidBookingCount, paidPeopleCount } = detail;

  return (
    <AdminShell
      active="waves"
      title={`${wave.date}, ${wave.startTime.slice(0, 5)}`}
      subtitle={
        <>
          {paidBookingCount} {paidBookingCount === 1 ? "group" : "groups"} · {paidPeopleCount} /{" "}
          {wave.peopleCapacity} people
          {wave.isHidden && " · unlisted"} · <Link href="/admin">back to all start times</Link>
        </>
      }
    >
      {wave.isHidden && privateToken && <PrivateLinkCard waveId={wave.id} url={privateBookingUrl(privateToken)} />}

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Edit start time</h3>
        <AdminWaveForm waveId={wave.id} wave={wave} />
      </div>

      <div className={styles.card}>
        <h3 style={{ marginBottom: 14, fontSize: 15 }}>Bookings ({bookings.length})</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Ticket</th>
              <th>Party</th>
              <th>Status</th>
              <th>Paid</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.leadName}
                  <br />
                  <span className="hint">{b.leadEmail}</span>
                </td>
                <td>{TICKET_TYPE_LABELS[b.ticketType]}</td>
                <td>
                  {b.partyType}, {b.headcount} {b.headcount === 1 ? "person" : "people"}
                </td>
                <td>
                  <span className={styles.badge}>{b.status}</span>
                  {/* A pending row is a guest who got as far as the card form
                      and didn't finish. This link re-opens that exact booking
                      at the same price — copy it to them rather than asking
                      them to start again. */}
                  {b.status === "pending" && (
                    <>
                      <br />
                      <Link href={`/book/resume/${b.id}`} className={styles.resumeLink}>
                        finish this booking →
                      </Link>
                    </>
                  )}
                  {/* Why it's still pending, when the browser managed to say. */}
                  {b.checkoutProblems.length > 0 && (
                    <span className={styles.checkoutProblem}>
                      {b.checkoutProblems[0].label}
                      {b.checkoutProblems.length > 1 ? ` ×${b.checkoutProblems.length}` : ""}
                    </span>
                  )}
                </td>
                <td>{formatMoney(b.amountPaidCents, b.currency)}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5}>No bookings yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
