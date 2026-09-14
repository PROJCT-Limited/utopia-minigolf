import { fetchUpcomingWaves } from "@/lib/booking/wavesRepo";
import { EARLY_BIRD_ENDS_AT, isEarlyBirdActive } from "@/lib/booking/pricing";
import { EarlyBirdCountdown } from "../components/found/EarlyBirdCountdown";
import { FoundHeader } from "../components/found/FoundHeader";
import { FoundFooter } from "../components/found/FoundFooter";
import sharedStyles from "../components/found/shared.module.css";
import { BookingWizard } from "./BookingWizard";
import styles from "./book.module.css";

export const metadata = { title: "Reserve — FOUND" };
export const dynamic = "force-dynamic"; // wave availability changes constantly — never cache this page

export default async function BookPage() {
  const waves = await fetchUpcomingWaves();
  // Worked out here, on the server, and handed down: the wizard is a client
  // component, and a browser clock is not allowed to decide what a guest pays.
  const now = new Date();
  const earlyBird = isEarlyBirdActive(now);

  return (
    <div className={sharedStyles.pageWrap}>
      {earlyBird && (
        <EarlyBirdCountdown endsAtMs={EARLY_BIRD_ENDS_AT.getTime()} serverNowMs={now.getTime()} withCta={false} />
      )}
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <BookingWizard waves={waves} earlyBird={earlyBird} />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
