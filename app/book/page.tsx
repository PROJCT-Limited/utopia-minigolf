import { fetchUpcomingWaves } from "@/lib/booking/wavesRepo";
import { fetchWaveIdsWithSessions } from "@/lib/sessions/sessionsRepo";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { BookingWizard } from "./BookingWizard";
import styles from "./book.module.css";

export const metadata = { title: "Reserve — UTOPIA" };
export const dynamic = "force-dynamic"; // wave availability changes constantly — never cache this page

export default async function BookPage() {
  const [waves, takenWaveIds] = await Promise.all([fetchUpcomingWaves(), fetchWaveIdsWithSessions()]);

  return (
    <>
      <SiteHeader />
      <main className={`wrap ${styles.page}`}>
        <BookingWizard waves={waves} takenWaveIds={takenWaveIds} />
      </main>
      <SiteFooter />
    </>
  );
}
