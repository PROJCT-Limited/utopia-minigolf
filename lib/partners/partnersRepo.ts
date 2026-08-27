// FILE: lib/partners/partnersRepo.ts
// -----------------------------------------------------------------------------
// General (non-admin) partner reads/writes: validating a ref code is a real,
// active partner, and logging a click. Used by proxy.ts and the checkout
// actions (createBooking.ts, createSession.ts). Admin-only reads (the report,
// the full partner list) live in lib/admin/partners.ts instead.
// -----------------------------------------------------------------------------

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UTOPIA_REF_COOKIE } from "./refCookie";

export interface ActivePartner {
  refCode: string;
  name: string;
}

/** Unknown or inactive ref codes return null — never an error, per the brief. */
export async function fetchActivePartnerByRefCode(refCode: string): Promise<ActivePartner | null> {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .select("ref_code, name")
    .eq("ref_code", refCode)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return { refCode: data.ref_code, name: data.name };
}

export async function logPartnerClick(refCode: string): Promise<void> {
  const { error } = await supabaseAdmin.from("partner_clicks").insert({ ref_code: refCode });
  if (error) {
    console.error("logPartnerClick: insert failed:", error.message);
  }
}

/**
 * Reads this request's ref cookie (set by proxy.ts) and re-validates it's
 * still an active partner right now — not just at click time — so a
 * since-deactivated partner stops earning commission on new bookings.
 * Returns null (untracked) if there's no cookie or it's no longer valid.
 */
export async function resolveReferredBy(): Promise<string | null> {
  const cookieStore = await cookies();
  const refCode = cookieStore.get(UTOPIA_REF_COOKIE)?.value;
  if (!refCode) return null;

  const partner = await fetchActivePartnerByRefCode(refCode);
  return partner?.refCode ?? null;
}
