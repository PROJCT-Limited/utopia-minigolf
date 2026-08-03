import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import styles from "../staticpage.module.css";

export const metadata = { title: "Privacy — UTOPIA" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className={`wrap ${styles.page}`}>
        <div className={styles.card}>
          <span className="lbl">Draft — subject to change before launch</span>
          <h1 className={styles.title}>Privacy</h1>

          <h2>What we collect</h2>
          <ul>
            <li>Booking details: name, email, party type, headcount, and wave selection.</li>
            <li>Payment confirmation from Stripe. We never see or store your card details.</li>
            <li>If you sign up for launch updates: your email and, optionally, your name.</li>
            <li>
              If you opt in to pairing: an optional age band, interest tags, and short bio, used only to help staff
              pair you well on the day.
            </li>
          </ul>

          <h2>Pairing data is private</h2>
          <p>
            Pairing information is opt-in, gated behind confirming you&rsquo;re 18 or over, and is only ever visible
            to UTOPIA staff for the purpose of pairing you with other guests. It is never shown publicly, never
            shown to other guests, and never used for anything else.
          </p>

          <h2>Who we share data with</h2>
          <p>
            We use Stripe to process payments, Resend to send booking and account emails, and Supabase to store
            booking records. Each only receives what it needs to do its job.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep booking records for as long as needed to run UTOPIA and meet our legal obligations. You can ask
            us to delete your data by emailing us at any time.
          </p>

          <h2>Contact</h2>
          <p>
            Questions or requests about your data can be sent to{" "}
            <a href="mailto:hi@projct.co" style={{ color: "var(--blue)" }}>
              hi@projct.co
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
