import { fetchUpcomingWaves } from "@/lib/booking/wavesRepo";
import { FoundHeader } from "../components/found/FoundHeader";
import { FoundFooter } from "../components/found/FoundFooter";
import sharedStyles from "../components/found/shared.module.css";
import { BookingWizard } from "./BookingWizard";
import styles from "./book.module.css";

export const metadata = { title: "Reserve — FOUND" };
export const dynamic = "force-dynamic"; // wave availability changes constantly — never cache this page

export default async function BookPage() {
  const waves = await fetchUpcomingWaves();

  return (
    <div className={sharedStyles.pageWrap}>
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <BookingWizard waves={waves} />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
