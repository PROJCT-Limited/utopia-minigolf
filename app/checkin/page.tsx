import { fetchTodaysArrivals } from "@/lib/checkin/checkinRepo";
import { CheckInFlow } from "./CheckInFlow";
import styles from "./checkin.module.css";

export const metadata = { title: "Check in — FOUND" };
export const dynamic = "force-dynamic"; // who's due at the door changes by the minute

export default async function CheckInPage() {
  const arrivals = await fetchTodaysArrivals();

  return (
    <main className={styles.page}>
      <CheckInFlow initialArrivals={arrivals} />
    </main>
  );
}
