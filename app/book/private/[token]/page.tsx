import { notFound } from "next/navigation";
import { fetchWaveByPrivateToken } from "@/lib/booking/wavesRepo";
import { PREBOOKING_ENDS_AT, isPrebookingActive } from "@/lib/booking/pricing";
import { PrebookingCountdown } from "../../../components/found/PrebookingCountdown";
import { FoundHeader } from "../../../components/found/FoundHeader";
import { FoundFooter } from "../../../components/found/FoundFooter";
import sharedStyles from "../../../components/found/shared.module.css";
import { BookingWizard } from "../../BookingWizard";
import styles from "../../book.module.css";

/**
 * Booking by invitation: the page an unlisted start time's private link opens
 * (see lib/admin/privateLink.ts). The token is the whole of the access
 * control — a wrong or retired one 404s exactly like a deleted page, which is
 * also what stops anyone learning that a private slot is there at all.
 *
 * `noindex` matters here: these links get pasted into WhatsApp and email, and
 * a crawler that followed one would put an internal evening in search results.
 */
export const metadata = {
  title: "Your start time — FOUND",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PrivateBookPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const wave = await fetchWaveByPrivateToken(token);
  // A start time that's been put back on public sale has no business still
  // being reachable by its old link — it's in the calendar like everything
  // else now.
  if (!wave || !wave.isHidden) notFound();

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
          <BookingWizard waves={[wave]} prebooking={prebooking} lockedWave={wave} />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
