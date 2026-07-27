"use client";

import { useState, type FormEvent } from "react";
import styles from "./NotifyMeForm.module.css";

export function NotifyMeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
        body: JSON.stringify({ email, name }),
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
    return <p className={styles.done}>You&rsquo;re on the list — we&rsquo;ll email you the moment dates are confirmed.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={styles.input}
        autoComplete="name"
      />
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={styles.input}
        autoComplete="email"
      />
      <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
        {status === "loading" ? "Signing up…" : "Get launch updates"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
