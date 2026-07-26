import { NextResponse } from 'next/server';
import { z } from 'zod';

import { loadMarkupRules, saveMarkupRule } from '@/lib/db/markup';
import { applyRule } from '@/lib/admin/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Access is enforced by `src/middleware.ts` for the whole /api/admin tree. */

const RuleSchema = z.object({
  productKind: z.enum(['device', 'pod', 'coil', 'liquid', 'nicsalt', 'disposable', 'bundle']),
  // Capped at +900 %: anything beyond that is a typo (e.g. bps entered as
  // percent), and silently accepting it would reprice the catalog absurdly.
  markupBps: z.number().int().min(0).max(90_000),
  floorCents: z.number().int().min(0).max(1_000_000),
  charmPricing: z.boolean(),
  active: z.boolean(),
});

export async function GET() {
  return NextResponse.json({ rules: loadMarkupRules() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const parsed = RuleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Regel ungültig', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const rule = parsed.data;
  const result = saveMarkupRule(rule);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 503 });
  }

  // Echo back what the rule would produce for a representative cost, so the
  // UI can confirm the saved value rather than re-deriving it client-side.
  const base = loadMarkupRules().find((r) => r.kind === rule.productKind)!;
  return NextResponse.json({
    ok: true,
    kind: rule.productKind,
    exampleCostCents: 249,
    exampleRetailCents: applyRule(249, base),
    note: 'Gespeichert. Die Preise werden beim nächsten Lieferanten-Sync oder Build neu abgeleitet.',
  });
}
