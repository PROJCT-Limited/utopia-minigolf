// FILE: app/api/subscribers/route.ts
// -----------------------------------------------------------------------------
// POST /api/subscribers — "Get launch updates" capture for people not ready to
// pay yet. Rate-limited per email to keep it from being abused as a spam sink.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const name = body.name?.trim() || null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit("subscribers", email, { max: 5, windowMinutes: 60 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const { error } = await supabaseAdmin.from("subscribers").upsert({ email, name }, { onConflict: "email" });
  if (error) {
    console.error("POST /api/subscribers: insert failed:", error.message);
    return NextResponse.json({ error: "Couldn't sign you up. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
