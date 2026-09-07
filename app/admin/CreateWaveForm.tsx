"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createWaveAction } from "@/lib/admin/waveActions";
import styles from "./admin.module.css";

/**
 * `defaultPeopleCapacity` is passed in rather than read from
 * lib/booking/capacityConfig.ts directly: this is a client component, and
 * PEOPLE_PER_START_TIME comes from a server-only env var that would read as
 * `undefined` in the browser.
 */
export function CreateWaveForm({ defaultPeopleCapacity }: { defaultPeopleCapacity: number }) {
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
        <label htmlFor="peopleCapacity">People cap</label>
        <input id="peopleCapacity" name="peopleCapacity" type="number" min={1} defaultValue={defaultPeopleCapacity} required />
      </div>
      <div className={styles.field}>
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue="provisional">
          <option value="provisional">Provisional</option>
          <option value="confirmed">Confirmed</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Adding…" : "Add start time"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
