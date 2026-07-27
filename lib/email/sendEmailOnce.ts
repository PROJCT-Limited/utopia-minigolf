// FILE: lib/email/sendEmailOnce.ts
// -----------------------------------------------------------------------------
// Send-exactly-once primitive, keyed on (booking_id, type) via email_events.
// Idempotency keys on "is there a `sent` row?" — not "does a row exist?" — so
// a `failed` or stuck `pending` row is safely retryable (webhook retry, admin
// resend), while a `sent` row still blocks duplicates for good.
//
// Known, accepted race: two truly simultaneous callers for the same
// (bookingId, type) could both reclaim a non-`sent` row and both send — the
// reclaim is a plain UPDATE, not constraint-guarded, unlike the first insert
// (protected by email_events' unique constraint). At this volume, not worth
// the extra locking complexity.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend } from "./resendClient";

export interface EmailToSend {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailOnceResult {
  sent: boolean;
}

export async function sendEmailOnce(
  bookingId: string,
  type: string,
  render: () => Promise<EmailToSend>
): Promise<SendEmailOnceResult> {
  const nowIso = () => new Date().toISOString();

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("email_events")
    .select("id, status")
    .eq("booking_id", bookingId)
    .eq("type", type)
    .maybeSingle();

  if (selectError) {
    console.error(`sendEmailOnce(${type}): lookup failed:`, selectError.message);
    return { sent: false };
  }

  if (existing?.status === "sent") {
    return { sent: false };
  }

  let eventId: string;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("email_events")
      .update({ status: "pending", error: null, updated_at: nowIso() })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) {
      console.error(`sendEmailOnce(${type}): reclaim failed:`, error.message);
      return { sent: false };
    }
    eventId = data.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("email_events")
      .insert({ booking_id: bookingId, type, status: "pending" })
      .select("id")
      .single();
    if (error) {
      // Unique violation on (booking_id, type) => a concurrent call claimed
      // this slot first. Let that call own the send.
      return { sent: false };
    }
    eventId = data.id;
  }

  try {
    const { to, subject, html } = await render();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });

    if (error) {
      await supabaseAdmin
        .from("email_events")
        .update({ status: "failed", error: error.message, updated_at: nowIso() })
        .eq("id", eventId);
      console.error(`sendEmailOnce(${type}): send failed:`, error.message);
      return { sent: false };
    }

    await supabaseAdmin
      .from("email_events")
      .update({ status: "sent", provider_id: data?.id ?? null, error: null, updated_at: nowIso() })
      .eq("id", eventId);
    return { sent: true };
  } catch (err) {
    const message = (err as Error).message;
    await supabaseAdmin
      .from("email_events")
      .update({ status: "failed", error: message, updated_at: nowIso() })
      .eq("id", eventId);
    console.error(`sendEmailOnce(${type}): send threw:`, message);
    return { sent: false };
  }
}
