// FILE: lib/admin/waveActions.ts
// -----------------------------------------------------------------------------
// Server actions behind the admin wave-detail form: flip provisional →
// confirmed and set the real date/time/wave-slot total — the one place this
// brief's "no code change needed" promise gets exercised. Auth is enforced by
// proxy.ts on every /admin/* and /api/admin/* request before these ever run;
// still worth remembering per the Next.js Data Security guide that Server
// Functions bypass a proxy matcher that excludes their route, so if this file
// is ever called from an unprotected path it needs its own check.
// -----------------------------------------------------------------------------
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface UpdateWaveResult {
  ok: boolean;
  error?: string;
}

export async function updateWaveAction(waveId: string, formData: FormData): Promise<UpdateWaveResult> {
  const status = String(formData.get("status") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const totalWaveSlots = Number(formData.get("totalWaveSlots"));

  if (!["provisional", "confirmed", "full"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  if (!date || !startTime || !Number.isInteger(totalWaveSlots) || totalWaveSlots < 1) {
    return { ok: false, error: "Date, time, and a valid wave-slot total are required." };
  }

  const { error } = await supabaseAdmin
    .from("waves")
    .update({ status, date, start_time: startTime, total_wave_slots: totalWaveSlots })
    .eq("id", waveId);

  if (error) {
    console.error("updateWaveAction: update failed:", error.message);
    return { ok: false, error: "Couldn't save changes." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/waves/${waveId}`);
  return { ok: true };
}

export async function createWaveAction(formData: FormData): Promise<UpdateWaveResult> {
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const totalWaveSlots = Number(formData.get("totalWaveSlots"));
  const status = String(formData.get("status") ?? "provisional");

  if (!date || !startTime || !Number.isInteger(totalWaveSlots) || totalWaveSlots < 1) {
    return { ok: false, error: "Date, time, and a valid wave-slot total are required." };
  }

  const { error } = await supabaseAdmin.from("waves").insert({
    date,
    start_time: startTime,
    total_wave_slots: totalWaveSlots,
    wave_slots_used: 0,
    status: ["provisional", "confirmed", "full"].includes(status) ? status : "provisional",
  });

  if (error) {
    console.error("createWaveAction: insert failed:", error.message);
    return { ok: false, error: "Couldn't create slot." };
  }

  revalidatePath("/admin");
  return { ok: true };
}
