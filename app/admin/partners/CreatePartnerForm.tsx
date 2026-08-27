"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPartnerAction } from "@/lib/admin/partnersActions";
import styles from "../admin.module.css";

export function CreatePartnerForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createPartnerAction(new FormData(e.currentTarget));
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
        <label htmlFor="refCode">Ref code</label>
        <input id="refCode" name="refCode" type="text" placeholder="hoka" pattern="[a-z0-9-]+" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="name">Partner name</label>
        <input id="name" name="name" type="text" placeholder="HOKA" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="commissionRatePercent">Commission %</label>
        <input
          id="commissionRatePercent"
          name="commissionRatePercent"
          type="number"
          min={0}
          max={100}
          step={0.5}
          defaultValue={5}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Adding…" : "Add partner"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
