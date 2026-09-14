"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rerollPrivateLinkAction } from "@/lib/admin/waveActions";
import styles from "../../admin.module.css";

/**
 * The link staff actually hand out for an unlisted start time. Built on the
 * server (privateBookingUrl reads NEXT_PUBLIC_SITE_URL, which is blank in the
 * browser) and passed down as a finished string.
 */
export function PrivateLinkCard({ waveId, url }: { waveId: string; url: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused outright (an insecure origin, a
      // locked-down tablet at the door). The link is on screen either way.
      setError("Couldn't copy — select the link and copy it by hand.");
    }
  }

  async function reroll() {
    if (!confirm("Replace this link? The one you've already sent will stop working immediately.")) return;

    setRerolling(true);
    setError(null);
    const result = await rerollPrivateLinkAction(waveId);
    setRerolling(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.card}>
      <h3 style={{ marginBottom: 6, fontSize: 15 }}>Private link</h3>
      <p className="hint" style={{ marginBottom: 14 }}>
        This start time is hidden from the booking calendar. Anyone with the link below can book it — and
        nobody else can find it.
      </p>

      <div className={styles.linkRow}>
        <code className={styles.linkBox}>{url}</code>
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="btn" onClick={reroll} disabled={rerolling}>
          {rerolling ? "Replacing…" : "Replace link"}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
