"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePartnerAction } from "@/lib/admin/partnersActions";
import type { AdminPartner } from "@/lib/admin/partners";
import styles from "../../admin.module.css";

export function PartnerForm({ partner }: { partner: AdminPartner }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const result = await updatePartnerAction(partner.id, new FormData(e.currentTarget));
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
        <label htmlFor="refCode">Ref code</label>
        <input id="refCode" type="text" value={partner.refCode} disabled />
      </div>
      <div className={styles.field}>
        <label htmlFor="name">Partner name</label>
        <input id="name" name="name" type="text" defaultValue={partner.name} required />
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
          defaultValue={partner.commissionRate * 100}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="active">Active</label>
        <select id="active" name="active" defaultValue={partner.active ? "on" : "off"}>
          <option value="on">Active</option>
          <option value="off">Inactive</option>
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
