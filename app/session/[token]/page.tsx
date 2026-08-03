import { notFound } from "next/navigation";
import { fetchSessionByShareToken, fetchSessionParticipantById } from "@/lib/sessions/sessionsRepo";
import { fetchWaveById } from "@/lib/booking/wavesRepo";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { SessionView } from "./SessionView";
import styles from "../../confirmation.module.css";

export const metadata = { title: "Join a session — UTOPIA" };
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
    <>
      <SiteHeader />
      <main className={`wrap ${styles.page}`}>
        <SessionView
          shareToken={token}
          session={session}
          wave={wave}
          justCreated={created === "1"}
          ownParticipantId={ownParticipant?.id ?? null}
          initialOwnStatus={ownParticipant?.status ?? null}
        />
      </main>
      <SiteFooter />
    </>
  );
}
