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
                A FOUND reservation is charged in full, per person, at the time of booking. Standard tickets (HKD
                150) cover one run across all five stations plus one drink; Unlimited tickets (HKD 220)
                cover the full hour with re-entry and bottomless drinks. No card details are stored by FOUND,
                payment is processed securely by Stripe.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>Dates are provisional</h2>
              <p>
                FOUND has not opened yet. Reservations made before launch are against a provisional wave, not a
                fixed date or time. We&rsquo;ll email the confirmed date and time slot as soon as it&rsquo;s locked
                in.
              </p>
            </div>
            <div className={styles.rule} />
            <div className={styles.section}>
              <h2>Rescheduling</h2>
              <p>
                Once your date is confirmed, you may reschedule your booking once, self-serve, to any available
                wave, up until {RESCHEDULE_CUTOFF_DAYS} days before your confirmed date. Use the manage-booking link
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
                Please arrive on time for your wave, late arrival may shorten your play time. FOUND reserves the
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
