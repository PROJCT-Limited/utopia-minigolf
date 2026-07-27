// FILE: lib/admin/loginAction.ts
// -----------------------------------------------------------------------------
// Server action behind the admin login form. Rate-limited per IP-ish key
// (we don't have a reliable client IP without more plumbing, so this keys on
// the submitted username instead — good enough for a single-operator tool).
// -----------------------------------------------------------------------------
"use server";

import { cookies } from "next/headers";
import { verifyAdminCredentials, createAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from "./session";
import { checkRateLimit } from "@/lib/rateLimit";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function adminLoginAction(formData: FormData): Promise<LoginResult> {
  const user = String(formData.get("user") ?? "");
  const pass = String(formData.get("pass") ?? "");

  const { allowed } = await checkRateLimit("admin_login", user || "unknown", { max: 8, windowMinutes: 15 });
  if (!allowed) {
    return { ok: false, error: "Too many attempts. Try again shortly." };
  }

  if (!verifyAdminCredentials(user, pass)) {
    return { ok: false, error: "Incorrect username or password." };
  }

  const { value, expires } = await createAdminSessionCookieValue();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return { ok: true };
}
