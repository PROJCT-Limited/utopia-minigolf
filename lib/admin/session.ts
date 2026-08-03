// FILE: lib/admin/session.ts
// -----------------------------------------------------------------------------
// HMAC-signed admin session cookie. Verified via Web Crypto (SubtleCrypto),
// not node:crypto, so the exact same check runs in both the login Server
// Action and proxy.ts (Node.js runtime by default as of Next.js 16 — see
// node_modules/next/dist/docs/.../proxy.md — not Edge). Single-operator,
// pre-launch tool — one shared ADMIN_USER/ADMIN_PASSWORD, no per-admin
// accounts.
// -----------------------------------------------------------------------------

export const ADMIN_SESSION_COOKIE = "utopia_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sign(payload: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

export async function createAdminSessionCookieValue(): Promise<{ value: string; expires: Date }> {
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const signature = await sign(String(expiresAtMs));
  return { value: `${expiresAtMs}.${signature}`, expires: new Date(expiresAtMs) };
}

export async function isValidAdminSessionCookieValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const [expiresAtRaw, signature] = value.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs) return false;

  const expected = await sign(expiresAtRaw);
  return timingSafeEqualStrings(expected, signature);
}

export function verifyAdminCredentials(user: string, pass: string): boolean {
  const expectedUser = process.env.ADMIN_USER ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";
  return (
    expectedUser.length > 0 &&
    expectedPass.length > 0 &&
    timingSafeEqualStrings(user, expectedUser) &&
    timingSafeEqualStrings(pass, expectedPass)
  );
}
