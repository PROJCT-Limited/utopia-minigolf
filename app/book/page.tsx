import { fetchUpcomingWaves } from "@/lib/booking/wavesRepo";
import { PREBOOKING_ENDS_AT, isPrebookingActive } from "@/lib/booking/pricing";
import { PrebookingCountdown } from "../components/found/PrebookingCountdown";
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
  const prebooking = isPrebookingActive(now);

  return (
    <div className={sharedStyles.pageWrap}>
      {prebooking && (
        <PrebookingCountdown
          endsAtMs={PREBOOKING_ENDS_AT.getTime()}
          serverNowMs={now.getTime()}
          withCta={false}
        />
      )}
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <BookingWizard waves={waves} prebooking={prebooking} />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
