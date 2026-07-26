import { NextResponse } from 'next/server';
import { recommend, TasteAnswersSchema } from '@/lib/recommend';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = TasteAnswersSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Antworten unvollständig', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  return NextResponse.json(recommend(parsed.data), {
    // The recommendation is a pure function of three enum answers — there are
    // only a few hundred possible responses, so let the CDN keep them.
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
