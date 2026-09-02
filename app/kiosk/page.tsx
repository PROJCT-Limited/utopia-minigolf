import { fetchCurrentGroups } from "@/lib/scoring/scoringRepo";
import { KioskFlow } from "./KioskFlow";
import styles from "./kiosk.module.css";

export const metadata = { title: "Scoring — UTOPIA" };
export const dynamic = "force-dynamic"; // who's "currently playing" changes every minute

export default async function KioskPage() {
  const groups = await fetchCurrentGroups();

  return (
    <main className={styles.page}>
      <KioskFlow initialGroups={groups} />
    </main>
  );
}
