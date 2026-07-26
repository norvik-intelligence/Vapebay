import 'server-only';
import { eq } from 'drizzle-orm';

import { getDb } from './index';
import { pseoTemplates } from './schema';
import { PSEO_TEMPLATES, type PseoTemplate } from '@/lib/seo/pseo';

/**
 * Persistence for the pSEO templates.
 *
 * Same contract as the markup rules: saving stores intent, it does not rebuild
 * pages. The routes are statically generated, so a toggled-off template keeps
 * serving until the next build — and the admin UI says exactly that. What the
 * DB *does* change immediately is what the admin screens display and what the
 * enrichment pipeline would read on its next run.
 */

export interface StoredPseoTemplate {
  id: string;
  enrichmentPrompt: string;
  enabled: boolean;
}

/** Templates with DB overrides applied, falling back to the compiled set. */
export function loadPseoTemplates(): PseoTemplate[] {
  try {
    const rows = getDb().select().from(pseoTemplates).all();
    if (rows.length === 0) return PSEO_TEMPLATES;

    return PSEO_TEMPLATES.map((base) => {
      const stored = rows.find((row) => row.id === base.id);
      if (!stored) return base;
      return {
        ...base,
        enrichmentPrompt: stored.enrichmentPrompt,
        enabled: stored.enabled,
      };
    });
  } catch {
    return PSEO_TEMPLATES;
  }
}

export type SavePseoResult = { ok: true; id: string } | { ok: false; message: string };

export function savePseoTemplate(input: StoredPseoTemplate): SavePseoResult {
  const base = PSEO_TEMPLATES.find((template) => template.id === input.id);
  if (!base) return { ok: false, message: `Unbekanntes Template: ${input.id}` };

  try {
    const db = getDb();
    const existing = db
      .select({ id: pseoTemplates.id })
      .from(pseoTemplates)
      .where(eq(pseoTemplates.id, input.id))
      .get();

    if (existing) {
      db.update(pseoTemplates)
        .set({
          enrichmentPrompt: input.enrichmentPrompt,
          enabled: input.enabled,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pseoTemplates.id, input.id))
        .run();
    } else {
      db.insert(pseoTemplates)
        .values({
          id: base.id,
          name: base.name,
          pattern: base.pattern,
          intent: base.intent,
          enrichmentPrompt: input.enrichmentPrompt,
          enabled: input.enabled,
          routeCount: base.routeCount(),
        })
        .run();
    }

    return { ok: true, id: input.id };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Template konnte nicht gespeichert werden',
    };
  }
}
