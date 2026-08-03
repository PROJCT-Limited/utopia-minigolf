import { notFound } from "next/navigation";
import { fetchBookingByManageToken, isPastRescheduleCutoff } from "@/lib/booking/reschedule";
import { fetchWaveById, fetchUpcomingWaves } from "@/lib/booking/wavesRepo";
import { fetchSessionByParticipantManageToken } from "@/lib/sessions/sessionsRepo";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { ManageView } from "./ManageView";
import styles from "../../confirmation.module.css";

export const metadata = { title: "Manage your booking — UTOPIA" };
export const dynamic = "force-dynamic";

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await fetchBookingByManageToken(token);

  if (booking) {
    const currentWave = await fetchWaveById(booking.waveId);
    const eligibleForReschedule =
      booking.status === "paid" && !booking.rescheduleUsed && (!currentWave || !isPastRescheduleCutoff(currentWave));

    const availableWaves = eligibleForReschedule
      ? (await fetchUpcomingWaves()).filter((w) => w.id !== booking.waveId && !w.isFull && !isPastRescheduleCutoff(w))
      : [];

    return (
      <>
        <SiteHeader />
        <main className={`wrap ${styles.page}`}>
          <ManageView
            kind="booking"
            token={token}
            booking={booking}
            currentWave={currentWave}
            eligibleForReschedule={eligibleForReschedule}
            availableWaves={availableWaves}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  const sessionManage = await fetchSessionByParticipantManageToken(token);
  if (!sessionManage) notFound();

  const wave = await fetchWaveById(sessionManage.session.waveId);

  return (
    <>
      <SiteHeader />
      <main className={`wrap ${styles.page}`}>
        <ManageView kind="session" participant={sessionManage.participant} session={sessionManage.session} wave={wave} />
      </main>
      <SiteFooter />
    </>
  );
}
