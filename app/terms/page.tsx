import { FoundHeader } from "../components/found/FoundHeader";
import { FoundFooter } from "../components/found/FoundFooter";
import { PageHeaderBlock } from "../components/found/PageHeaderBlock";
import sharedStyles from "../components/found/shared.module.css";
import { RESCHEDULE_CUTOFF_DAYS } from "@/lib/booking/copy";
import styles from "../legal.module.css";

export const metadata = { title: "Terms — FOUND" };

export default function TermsPage() {
  return (
    <div className={sharedStyles.pageWrap}>
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <PageHeaderBlock label="Terms" heading="Terms" />
        <div className={styles.wrap}>
          <div className={styles.content}>
            <div className={styles.section}>
              <h2>Bookings &amp; payment</h2>
              <p>
                A FOUND reservation is charged in full, per person, at the time of booking. Standard tickets
                cover one run across all five stations plus one drink; Unlimited tickets cover the full hour
                with re-entry and bottomless drinks. No card details are stored by FOUND, payment is processed
                securely by Stripe.
              </p>
              <p>
                Bookings made on or before 7 October 2026 (Hong Kong time) are charged at the pre-booking
                price of HKD 150 for Standard and HKD 220 for Unlimited. Bookings made after that are charged
                at HKD 170 and HKD 240. Earlier bookings, made under the early bird price that ran until
                20 September 2026, were charged HKD 120 and HKD 180. The price is fixed at the time of
                booking: rescheduling an existing booking never re-prices it, and no refund of the difference
                is made when a price changes either way. Walk-in tickets bought at the door are charged at
                HKD 170 and HKD 240 regardless of date.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>Dates are provisional</h2>
              <p>
                FOUND has not opened yet. Reservations made before launch are against a provisional start time,
                not a fixed date or time. We&rsquo;ll email the confirmed date and time as soon as it&rsquo;s
                locked in.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>Rescheduling</h2>
              <p>
                Once your date is confirmed, you may reschedule your booking once, self-serve, to any start time
                with room for your group, up until {RESCHEDULE_CUTOFF_DAYS} days before your confirmed date. Use the manage-booking link
                in your confirmation email. Requests closer to the date, or a second reschedule, should be sent by
                replying to that email.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>Cancellations</h2>
              <p>
                To cancel a booking, reply to your confirmation email with your request. We&rsquo;ll confirm the
                outcome directly with you.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>At the venue</h2>
              <p>
                Please arrive on time for your start time, late arrival may shorten your play time. FOUND reserves the
                right to refuse entry to anyone who is intoxicated, disruptive, or a safety risk to staff or other
                guests.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>Contact</h2>
              <p>
                Questions about these terms can be sent to <a href="mailto:hi@projct.co">hi@projct.co</a>.
              </p>
            </div>
            <div className={styles.rule} />
          </div>
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
