/**
 * Admin session tokens.
 *
 * Edge-runtime safe: Web Crypto only, no Node built-ins, so `middleware.ts` can
 * verify a session without pulling in a Node runtime.
 *
 * The token is `expiry.HMAC-SHA256(expiry)`. It carries no user data because
 * there is exactly one admin identity — a shared secret in the environment.
 * That is a deliberate scope choice, not an oversight: a full user table for a
 * single-operator shop is machinery without a job. When a second operator
 * appears, replace this with real sessions rather than adding a second secret.
 */

export const ADMIN_COOKIE = 'vapebay_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — one working day, then re-auth.

const encoder = new TextEncoder();

function requireSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  // Failing closed is the point: a missing secret must lock the panel, never
  // fall back to a default that ships to production.
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET fehlt oder ist kürzer als 16 Zeichen');
  }
  return secret;
}

export function isAdminConfigured(): boolean {
  try {
    requireSecret();
    return Boolean(process.env.ADMIN_PASSWORD);
  } catch {
    return false;
  }
}

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

/**
 * Length-independent constant-time compare.
 *
 * A plain `===` on a signature leaks its correct prefix through timing. The
 * lengths are hashed first so this is also safe when they differ.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueSession(): Promise<{ token: string; maxAgeSeconds: number }> {
  const secret = requireSecret();
  const expiry = String(Date.now() + SESSION_TTL_MS);
  return {
    token: `${expiry}.${await hmac(expiry, secret)}`,
    maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  try {
    return timingSafeEqual(signature, await hmac(expiry, requireSecret()));
  } catch {
    // No secret configured — deny rather than allow.
    return false;
  }
}

/**
 * Verifies the submitted password.
 *
 * `ADMIN_PASSWORD` holds a SHA-256 hex digest, not the plaintext, so a leaked
 * environment dump does not hand over a working credential directly. This is
 * not a substitute for a slow KDF: SHA-256 is fast enough to brute-force a weak
 * password offline, so the deploy docs require a generated one.
 */
export async function verifyPassword(submitted: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(await sha256Hex(submitted), expected.trim().toLowerCase());
}
