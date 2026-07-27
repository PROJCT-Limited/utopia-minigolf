// FILE: lib/email/resendClient.ts
// -----------------------------------------------------------------------------
// One Resend client, shared by sendEmailOnce.ts and any per-request send that
// intentionally bypasses that idempotency wrapper.
// -----------------------------------------------------------------------------

import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);
