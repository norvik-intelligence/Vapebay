import { NextResponse } from 'next/server';
import { z } from 'zod';

import { loadPseoTemplates, savePseoTemplate } from '@/lib/db/pseo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Access is enforced by `src/middleware.ts` for the whole /api/admin tree. */

const TemplateSchema = z.object({
  id: z.enum(['kompatibel', 'geschmack', 'marken']),
  // Generous ceiling, but a ceiling: a runaway prompt is a paste accident,
  // and the enrichment pipeline would send it to an LLM per route.
  enrichmentPrompt: z.string().min(20).max(4000),
  enabled: z.boolean(),
});

export async function GET() {
  return NextResponse.json(
    {
      templates: loadPseoTemplates().map((template) => ({
        id: template.id,
        name: template.name,
        pattern: template.pattern,
        enrichmentPrompt: template.enrichmentPrompt,
        enabled: template.enabled,
        routeCount: template.routeCount(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PUT(request: Request) {
  const parsed = TemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Template ungültig', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const result = savePseoTemplate(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    note: 'Gespeichert. Der Aktiv-Schalter greift beim nächsten Build; der Prompt beim nächsten Anreicherungslauf.',
  });
}
