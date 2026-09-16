import { notFound } from "next/navigation";
import { fetchBookingSummary } from "@/lib/booking/bookingRepo";
import { FoundHeader } from "../../components/found/FoundHeader";
import { ClearCheckoutState } from "./ClearCheckoutState";
import { FoundFooter } from "../../components/found/FoundFooter";
import sharedStyles from "../../components/found/shared.module.css";
import { ConfirmationView } from "./ConfirmationView";
import styles from "../../confirmation.module.css";

export const metadata = { title: "Booking confirmed — FOUND" };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const booking = await fetchBookingSummary(bookingId);
  if (!booking) notFound();

  return (
    <div className={sharedStyles.pageWrap}>
      <ClearCheckoutState />
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <ConfirmationView bookingId={bookingId} initialStatus={booking.status} initialBooking={booking} />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
