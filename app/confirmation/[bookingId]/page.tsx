import { notFound } from "next/navigation";
import { fetchBookingSummary } from "@/lib/booking/bookingRepo";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { ConfirmationView } from "./ConfirmationView";
import styles from "../../confirmation.module.css";

export const metadata = { title: "Booking confirmed — UTOPIA" };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const booking = await fetchBookingSummary(bookingId);
  if (!booking) notFound();

  return (
    <>
      <SiteHeader />
      <main className={`wrap ${styles.page}`}>
        <ConfirmationView bookingId={bookingId} initialStatus={booking.status} initialBooking={booking} />
      </main>
      <SiteFooter />
    </>
  );
}
