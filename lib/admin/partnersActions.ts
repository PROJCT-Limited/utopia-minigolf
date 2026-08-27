// FILE: lib/admin/partnersActions.ts
// -----------------------------------------------------------------------------
// Server actions behind the admin Partners form — same shape as
// lib/admin/waveActions.ts. Auth is enforced by proxy.ts on every /admin/*
// and /api/admin/* request before these ever run.
// -----------------------------------------------------------------------------
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidRefCode, parseCommissionRatePercent } from "@/lib/partners/validation";

export interface PartnerActionResult {
  ok: boolean;
  error?: string;
}

export async function createPartnerAction(formData: FormData): Promise<PartnerActionResult> {
  const refCode = String(formData.get("refCode") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const commissionRate = parseCommissionRatePercent(String(formData.get("commissionRatePercent") ?? ""));

  if (!isValidRefCode(refCode)) {
    return { ok: false, error: "Ref code must be lowercase letters, numbers, and hyphens only." };
  }
  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  if (commissionRate === null) {
    return { ok: false, error: "Commission rate must be a percentage between 0 and 100." };
  }

  const { error } = await supabaseAdmin.from("partners").insert({
    ref_code: refCode,
    name,
    commission_rate: commissionRate,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That ref code is already in use." };
    }
    console.error("createPartnerAction: insert failed:", error.message);
    return { ok: false, error: "Couldn't create the partner." };
  }

  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function updatePartnerAction(partnerId: string, formData: FormData): Promise<PartnerActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const commissionRate = parseCommissionRatePercent(String(formData.get("commissionRatePercent") ?? ""));
  const active = formData.get("active") === "on";

  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  if (commissionRate === null) {
    return { ok: false, error: "Commission rate must be a percentage between 0 and 100." };
  }

  const { error } = await supabaseAdmin
    .from("partners")
    .update({ name, commission_rate: commissionRate, active })
    .eq("id", partnerId);

  if (error) {
    console.error("updatePartnerAction: update failed:", error.message);
    return { ok: false, error: "Couldn't save changes." };
  }

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true };
}
