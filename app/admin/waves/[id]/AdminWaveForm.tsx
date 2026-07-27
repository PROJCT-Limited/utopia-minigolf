"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateWaveAction } from "@/lib/admin/waveActions";
import type { WaveView } from "@/lib/booking/waves";
import styles from "../../admin.module.css";

export function AdminWaveForm({ waveId, wave }: { waveId: string; wave: WaveView }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const result = await updateWaveAction(waveId, new FormData(e.currentTarget));
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <div className={styles.field}>
        <label htmlFor="date">Date</label>
        <input id="date" name="date" type="date" defaultValue={wave.date} required />
      </div>
      <div className={styles.field}>
        <label htmlFor="startTime">Start time</label>
        <input id="startTime" name="startTime" type="time" defaultValue={wave.startTime.slice(0, 5)} required />
      </div>
      <div className={styles.field}>
        <label htmlFor="capacity">Capacity</label>
        <input id="capacity" name="capacity" type="number" min={1} defaultValue={wave.capacity} required />
      </div>
      <div className={styles.field}>
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={wave.status}>
          <option value="provisional">Provisional</option>
          <option value="confirmed">Confirmed</option>
          <option value="full">Full</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save changes"}
      </button>
      {saved && !error && <p className="hint">Saved.</p>}
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
