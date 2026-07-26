import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ADMIN_COOKIE, isAdminConfigured, issueSession, verifyPassword } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({ password: z.string().min(1) });

/** Deliberate delay on every attempt — makes offline-speed guessing useless. */
const THROTTLE_MS = 400;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          'Admin-Zugang ist nicht konfiguriert. ADMIN_SESSION_SECRET und ADMIN_PASSWORD in .env setzen.',
      },
      { status: 503 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Passwort fehlt' }, { status: 422 });
  }

  const [ok] = await Promise.all([
    verifyPassword(parsed.data.password),
    new Promise((resolve) => setTimeout(resolve, THROTTLE_MS)),
  ]);

  if (!ok) {
    // No distinction between "wrong password" and "no such user" — there is
    // only one identity, and a specific error would confirm it exists.
    return NextResponse.json({ error: 'Zugangsdaten ungültig' }, { status: 401 });
  }

  const { token, maxAgeSeconds } = await issueSession();
  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true, // not readable from JS, so XSS cannot exfiltrate it
    sameSite: 'lax', // blocks cross-site POSTs while keeping normal navigation
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });

  return response;
}

/** Logout. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
