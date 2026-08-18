"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import type { WaveView } from "@/lib/booking/waves";
import type { SessionForView } from "@/lib/sessions/sessionsRepo";
import { PRICE_PER_PERSON_CENTS } from "@/lib/booking/pricing";
import { DATE_TBC_NOTICE, PUBLIC_SESSION_EXPLAINER, SESSION_FULL_NOTICE } from "@/lib/booking/copy";
import { joinSessionWithPaymentIntent } from "@/lib/sessions/joinSession";
import { isSessionJoinable } from "@/lib/sessions/sessionCapacity";
import { formatWaveDate } from "../../utils/formatWave";
import { PaymentStep } from "../../book/PaymentStep";
import confirmationStyles from "../../confirmation.module.css";
import bookStyles from "../../book/book.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 12; // ~30s

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

interface SessionViewProps {
  shareToken: string;
  session: SessionForView;
  wave: WaveView | null;
  justCreated: boolean;
  ownParticipantId: string | null;
  initialOwnStatus: "pending" | "paid" | "cancelled" | null;
}

export function SessionView({
  shareToken,
  session,
  wave,
  justCreated,
  ownParticipantId,
  initialOwnStatus,
}: SessionViewProps) {
  const router = useRouter();
  const [ownStatus, setOwnStatus] = useState(initialOwnStatus);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!ownParticipantId || ownStatus !== "pending") return;

    const interval = setInterval(async () => {
      pollCount.current += 1;
      try {
        const res = await fetch(`/api/session-participants/${ownParticipantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== "pending") {
            setOwnStatus(data.status);
            router.refresh();
            clearInterval(interval);
          }
        }
      } catch {
        // transient — the next tick will retry
      }
      if (pollCount.current >= MAX_POLLS) clearInterval(interval);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ownParticipantId, ownStatus, router]);

  if (ownParticipantId && ownStatus === "pending") {
    return (
      <div className={confirmationStyles.card}>
        <p className={confirmationStyles.pending}>Confirming your payment… this only takes a moment.</p>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/session/${shareToken}` : "";
  const canJoin = isSessionJoinable({
    status: session.status,
    paidCount: session.paidCount,
    maxPlayers: session.maxPlayers,
    waveIsFull: wave?.isFull ?? false,
  });

  return (
    <div className={confirmationStyles.card}>
      {justCreated && ownStatus === "paid" && <ShareLinkBanner shareUrl={shareUrl} />}

      <span className="lbl">Public session</span>
      <h1 className={confirmationStyles.title}>
        {wave ? `${formatWaveDate(wave.date)}, ${wave.timeLabel}` : "Slot to be confirmed"}
      </h1>

      <p className="hint" style={{ marginBottom: 16 }}>
        {PUBLIC_SESSION_EXPLAINER}
      </p>

      <div className={confirmationStyles.row}>
        <span>Spots filled</span>
        <span>
          {session.paidCount} of {session.maxPlayers}
        </span>
      </div>
      <div className={confirmationStyles.row}>
        <span>Who&rsquo;s in</span>
        <span>{session.paidParticipantNames.length > 0 ? session.paidParticipantNames.join(", ") : "Just you so far"}</span>
      </div>

      {wave?.status === "provisional" && (
        <p className="notice" style={{ marginTop: 20 }}>
          {DATE_TBC_NOTICE}
        </p>
      )}

      {!canJoin ? (
        <p style={{ marginTop: 20, fontSize: 14, color: "var(--ink-2)" }}>{SESSION_FULL_NOTICE}</p>
      ) : (
        <JoinForm shareToken={shareToken} />
      )}
    </div>
  );
}

function ShareLinkBanner({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(shareUrl, { width: 208, margin: 1, color: { dark: "#12151c", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // QR generation failing is non-fatal — the link text is still copyable
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access can fail (permissions, non-secure context) — the URL is still visible to copy manually
    }
  }

  return (
    <div className="notice" style={{ marginBottom: 20 }}>
      <p style={{ marginBottom: 4, fontWeight: 700, fontSize: 16 }}>Congrats — your session is live!</p>
      <p style={{ marginBottom: 14, fontSize: 13.5, color: "var(--ink-2)" }}>
        Share this link or QR code so people can join and pay for their own place.
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- data: URL generated client-side, next/image can't optimize it
          <img
            src={qrDataUrl}
            alt="QR code to join this session"
            width={104}
            height={104}
            style={{ borderRadius: 12, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <code style={{ fontSize: 13, wordBreak: "break-all", display: "block", marginBottom: 10 }}>{shareUrl}</code>
          <button type="button" className="btn btn-outline" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinForm({ shareToken }: { shareToken: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ participantId: string; clientSecret: string } | null>(null);

  const valid = name.trim().length > 0 && EMAIL_RE.test(email.trim());

  async function handleJoin() {
    setSubmitting(true);
    setError(null);

    const result = await joinSessionWithPaymentIntent({ shareToken, name, email });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPayment({ participantId: result.participantId, clientSecret: result.clientSecret });
  }

  if (payment) {
    return (
      <div style={{ marginTop: 20 }}>
        <PaymentStep
          bookingId={payment.participantId}
          clientSecret={payment.clientSecret}
          amountLabel={formatMoney(PRICE_PER_PERSON_CENTS)}
          returnPath={`/session/${shareToken}?p=${payment.participantId}`}
        />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className={bookStyles.field}>
        <label htmlFor="joinName">Your name</label>
        <input id="joinName" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className={bookStyles.field}>
        <label htmlFor="joinEmail">Email</label>
        <input id="joinEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%" }}
        onClick={handleJoin}
        disabled={!valid || submitting}
      >
        {submitting ? "Starting payment…" : `Join & pay ${formatMoney(PRICE_PER_PERSON_CENTS)}`}
      </button>
      {error && <p className={bookStyles.error}>{error}</p>}
    </div>
  );
}
