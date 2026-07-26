import { NextResponse } from 'next/server';
import { z } from 'zod';

import { recordVerification } from '@/lib/db/compliance';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  provider: z.enum(['postident', 'sofort']),
  birthDate: z.string().min(1),
  lastName: z.string().min(1),
});

/**
 * Simulated identity check (PostIdent / SOFORT Ident).
 *
 * A production integration POSTs to the provider, receives a case ID and waits
 * for an async webhook. The shape here mirrors that contract — reference id,
 * status, provider, timestamp — so swapping in the real client is a change to
 * this file only. Every result is written to the compliance log regardless of
 * outcome: §10 JuSchG requires the failed attempts to be retained too.
 */
export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 422 });
  }

  const { provider, birthDate, lastName } = parsed.data;

  const birth = new Date(birthDate);
  const eighteenth = new Date(birth);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  const isAdult = !Number.isNaN(birth.getTime()) && eighteenth <= new Date();

  // Network latency the real providers exhibit — the UI needs a pending state
  // that lasts long enough to be seen, or the spinner reads as a glitch.
  await new Promise((resolve) => setTimeout(resolve, 900));

  const reference = `${provider === 'postident' ? 'PI' : 'SI'}-${Date.now().toString(36).toUpperCase()}`;
  const status = isAdult ? 'verified' : 'rejected';

  recordVerification({
    reference,
    provider,
    status,
    lastName,
    birthDate,
    checkedAt: new Date().toISOString(),
  });

  if (!isAdult) {
    return NextResponse.json(
      {
        status,
        reference,
        message:
          'Die Altersprüfung wurde nicht bestanden. Der Verkauf nikotinhaltiger Produkte an Minderjährige ist gesetzlich untersagt.',
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status,
    reference,
    provider,
    verifiedAt: new Date().toISOString(),
    message: 'Altersprüfung erfolgreich. Dein Konto ist dauerhaft verifiziert.',
  });
}
