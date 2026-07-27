"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createWaveAction } from "@/lib/admin/waveActions";
import styles from "./admin.module.css";

export function CreateWaveForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createWaveAction(new FormData(e.currentTarget));
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <div className={styles.field}>
        <label htmlFor="date">Date</label>
        <input id="date" name="date" type="date" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="startTime">Start time</label>
        <input id="startTime" name="startTime" type="time" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="capacity">Capacity</label>
        <input id="capacity" name="capacity" type="number" min={1} defaultValue={12} required />
      </div>
      <div className={styles.field}>
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue="provisional">
          <option value="provisional">Provisional</option>
          <option value="confirmed">Confirmed</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Adding…" : "Add wave"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
