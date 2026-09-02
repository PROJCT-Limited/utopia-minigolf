import { notFound } from "next/navigation";
import { fetchSessionByShareToken, fetchSessionParticipantById } from "@/lib/sessions/sessionsRepo";
import { fetchWaveById } from "@/lib/booking/wavesRepo";
import { FoundHeader } from "../../components/found/FoundHeader";
import { FoundFooter } from "../../components/found/FoundFooter";
import sharedStyles from "../../components/found/shared.module.css";
import { SessionView } from "./SessionView";
import styles from "../../confirmation.module.css";

export const metadata = { title: "Join a session — FOUND" };
export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string; p?: string }>;
}) {
  const { token } = await params;
  const { created, p } = await searchParams;

  const session = await fetchSessionByShareToken(token);
  if (!session) notFound();

  const wave = await fetchWaveById(session.waveId);
  const ownParticipant = p ? await fetchSessionParticipantById(p) : null;

  return (
    <div className={sharedStyles.pageWrap}>
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <div className={styles.page}>
          <SessionView
            shareToken={token}
            session={session}
            wave={wave}
            justCreated={created === "1"}
            ownParticipantId={ownParticipant?.id ?? null}
            initialOwnStatus={ownParticipant?.status ?? null}
          />
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
