// FILE: lib/admin/waveActions.ts
// -----------------------------------------------------------------------------
// Server actions behind the admin start-time form: flip provisional →
// confirmed and set the real date/time/people cap — the one place this
// brief's "no code change needed" promise gets exercised. Auth is enforced by
// proxy.ts on every /admin/* and /api/admin/* request before these ever run;
// still worth remembering per the Next.js Data Security guide that Server
// Functions bypass a proxy matcher that excludes their route, so if this file
// is ever called from an unprotected path it needs its own check.
// -----------------------------------------------------------------------------
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PEOPLE_PER_START_TIME } from "@/lib/booking/capacityConfig";

export interface UpdateWaveResult {
  ok: boolean;
  error?: string;
}

export async function updateWaveAction(waveId: string, formData: FormData): Promise<UpdateWaveResult> {
  const status = String(formData.get("status") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const peopleCapacity = Number(formData.get("peopleCapacity"));

  if (!["provisional", "confirmed", "full"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  if (!date || !startTime || !Number.isInteger(peopleCapacity) || peopleCapacity < 1) {
    return { ok: false, error: "Date, time, and a valid people cap are required." };
  }

  // Lowering a cap below what's already sold would break the DB check
  // constraint with a raw Postgres error — say what's actually wrong instead.
  const { data: current } = await supabaseAdmin
    .from("waves")
    .select("people_used")
    .eq("id", waveId)
    .maybeSingle();
  if (current && peopleCapacity < current.people_used) {
    return {
      ok: false,
      error: `${current.people_used} people are already booked at this start time — the cap can't go below that.`,
    };
  }

  const { error } = await supabaseAdmin
    .from("waves")
    .update({
      status,
      date,
      start_time: startTime,
      people_capacity: peopleCapacity,
      // Groups are only ever a reporting figure, but this column still carries
      // a `<= total_wave_slots` check constraint — keep it out of the way.
      total_wave_slots: peopleCapacity,
    })
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
  const rawCapacity = formData.get("peopleCapacity");
  const peopleCapacity = rawCapacity == null || rawCapacity === "" ? PEOPLE_PER_START_TIME : Number(rawCapacity);
  const status = String(formData.get("status") ?? "provisional");

  if (!date || !startTime || !Number.isInteger(peopleCapacity) || peopleCapacity < 1) {
    return { ok: false, error: "Date, time, and a valid people cap are required." };
  }

  const { error } = await supabaseAdmin.from("waves").insert({
    date,
    start_time: startTime,
    people_capacity: peopleCapacity,
    people_used: 0,
    total_wave_slots: peopleCapacity,
    wave_slots_used: 0,
    status: ["provisional", "confirmed", "full"].includes(status) ? status : "provisional",
  });

  if (error) {
    console.error("createWaveAction: insert failed:", error.message);
    return { ok: false, error: "Couldn't create the start time." };
  }

  revalidatePath("/admin");
  return { ok: true };
}
