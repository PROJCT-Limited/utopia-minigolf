"use client";

import { useState } from "react";

export function CopyRefLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access can fail (permissions, non-secure context) — the URL is still visible to copy manually
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <code style={{ fontSize: 12, wordBreak: "break-all" }}>{url}</code>
      <button type="button" className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 12, flexShrink: 0 }} onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
