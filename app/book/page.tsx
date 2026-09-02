import { fetchUpcomingWaves } from "@/lib/booking/wavesRepo";
import { fetchWaveIdsWithSessions } from "@/lib/sessions/sessionsRepo";
import { FoundHeader } from "../components/found/FoundHeader";
import { FoundFooter } from "../components/found/FoundFooter";
import sharedStyles from "../components/found/shared.module.css";
import { BookingWizard } from "./BookingWizard";
import styles from "./book.module.css";

export const metadata = { title: "Reserve — FOUND" };
export const dynamic = "force-dynamic"; // wave availability changes constantly — never cache this page

export default async function BookPage() {
  const [waves, takenWaveIds] = await Promise.all([fetchUpcomingWaves(), fetchWaveIdsWithSessions()]);

  return (
    <div className={sharedStyles.pageWrap}>
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <BookingWizard waves={waves} takenWaveIds={takenWaveIds} />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
