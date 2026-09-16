import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { fetchResumableBooking } from "@/lib/booking/resumeBooking";
import { TICKET_TYPE_LABELS } from "@/lib/booking/pricing";
import { formatWaveDate } from "../../../utils/formatWave";
import { FoundHeader } from "../../../components/found/FoundHeader";
import { FoundFooter } from "../../../components/found/FoundFooter";
import sharedStyles from "../../../components/found/shared.module.css";
import confirmationStyles from "../../../confirmation.module.css";
import { PaymentStep } from "../../PaymentStep";
import styles from "../../book.module.css";

/**
 * Finish a booking that was interrupted.
 *
 * The booking id is the key, the same way it is on the confirmation page —
 * unguessable, and known only to the guest's browser and to staff, who can
 * copy this link from the admin panel and send it to someone stuck.
 *
 * noindex: these URLs get pasted into WhatsApp and email.
 */
export const metadata = {
  title: "Finish your booking — FOUND",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ResumeBookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const result = await fetchResumableBooking(bookingId);

  // Already paid: send them to the receipt rather than a second card form.
  if (result.state === "paid") redirect(`/confirmation/${bookingId}`);
  if (result.state === "gone" && result.reason !== "full") notFound();

  return (
    <div className={sharedStyles.pageWrap}>
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <section className={styles.stepSection}>
            <div className={styles.stepInner}>
              {result.state === "gone" ? (
                <>
                  <h1 className={styles.stepHeading}>That start time filled up</h1>
                  <p className={styles.notice} style={{ marginTop: 20 }}>
                    Nothing has been charged. The slot you were booking sold out before the payment went
                    through — pick another and you&rsquo;ll keep the same price.
                  </p>
                  <Link href="/book" className={sharedStyles.pillBtn} style={{ marginTop: 24 }}>
                    Choose another time →
                  </Link>
                </>
              ) : (
                <>
                  <h1 className={styles.stepHeading}>Finish your booking</h1>
                  <p className={styles.notice} style={{ marginTop: 20 }}>
                    Your place is still here and nothing has been charged yet.
                  </p>

                  <div className={styles.stepBody}>
                    <div className={confirmationStyles.box}>
                      <div className={confirmationStyles.row}>
                        <span className={sharedStyles.detailLabel}>Ticket</span>
                        <span className={sharedStyles.detailValue}>
                          {TICKET_TYPE_LABELS[result.booking.ticketType]}
                        </span>
                      </div>
                      <div className={confirmationStyles.row}>
                        <span className={sharedStyles.detailLabel}>Party</span>
                        <span className={sharedStyles.detailValue}>
                          {result.booking.headcount}{" "}
                          {result.booking.headcount === 1 ? "player" : "players"}
                        </span>
                      </div>
                      <div className={confirmationStyles.row}>
                        <span className={sharedStyles.detailLabel}>When</span>
                        <span className={sharedStyles.detailValue}>
                          {formatWaveDate(result.booking.waveDate)}, {result.waveTimeLabel}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 28 }}>
                      <PaymentStep
                        bookingId={result.booking.id}
                        clientSecret={result.clientSecret}
                        amountLabel={`HKD ${(result.booking.amountPaidCents / 100).toFixed(0)}`}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
