"use client";

import { useState, type FormEvent } from "react";
import styles from "../page.module.css";

export function FoundNotifySignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className={styles.notifyDone}>You&rsquo;re on the list — we&rsquo;ll email you when dates are confirmed.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.notifyRow}>
      <input
        type="email"
        placeholder="Email for launch updates"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={styles.notifyInput}
        autoComplete="email"
      />
      <button type="submit" className={styles.notifyBtn} disabled={status === "loading"}>
        {status === "loading" ? "Signing up…" : "Sign up →"}
      </button>
      {error && <p className={styles.notifyError}>{error}</p>}
    </form>
  );
}
