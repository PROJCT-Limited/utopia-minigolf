import { fetchCurrentGroups } from "@/lib/scoring/scoringRepo";
import { KioskFlow } from "./KioskFlow";
import { DEMO_QUERY_FLAG } from "./demoFeed";
import styles from "./kiosk.module.css";

export const metadata = { title: "Scoring — FOUND" };
export const dynamic = "force-dynamic"; // who's "currently playing" changes every minute

export default async function KioskPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and has to be awaited (see
  // node_modules/next/dist/docs/.../file-conventions/page.md).
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const groups = await fetchCurrentGroups();
  // Read on the server and passed down, rather than sniffed from
  // window.location in the client: the flag has to be known on the very
  // first render, and reading it client-side would mean a hydration mismatch
  // on every demo load.
  const demo = (await searchParams)[DEMO_QUERY_FLAG] === "1";

  return (
    <main className={styles.page}>
      <KioskFlow initialGroups={groups} demo={demo} />
    </main>
  );
}
