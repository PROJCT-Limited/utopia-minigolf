// FILE: lib/admin/loginAction.ts
// -----------------------------------------------------------------------------
// Server action behind the admin login form. Rate-limited per IP-ish key
// (we don't have a reliable client IP without more plumbing, so this keys on
// the submitted username instead — good enough for a single-operator tool).
// -----------------------------------------------------------------------------
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminCredentials, createAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from "./session";
import { checkRateLimit } from "@/lib/rateLimit";

export interface LoginResult {
  ok: false;
  error: string;
}

// On success this redirects server-side instead of returning `{ ok: true }` —
// letting the caller do `router.push("/admin")` + `router.refresh()` after an
// awaited action call raced the two soft navigations against each other
// (refresh sometimes won, re-fetching whatever route the client still
// considered "current" at that instant and landing back on /admin/login
// despite a valid, freshly-set session cookie). redirect() inside a Server
// Action sidesteps that entirely — no client-side navigation code needed.
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
    // `Secure` cookies are refused by the browser on any non-HTTPS origin —
    // including local dev over plain http://localhost in Safari and Firefox
    // (Chromium alone special-cases localhost as a secure context, which is
    // why this could silently fail to reproduce in a Chromium-only test).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });

  redirect("/admin");
}
