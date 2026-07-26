import 'server-only';
import { eq } from 'drizzle-orm';

import { getDb } from './index';
import { markupRules } from './schema';
import { MARKUP_RULE_SET, type MarkupRule } from '@/lib/admin/pricing';

/**
 * Persistence for the pricing rules.
 *
 * Storing a rule does NOT reprice the catalog. Prices are derived at build time
 * from `lib/data/catalog.ts`, so a saved rule takes effect on the next supplier
 * sync or the next build. The admin UI says so in those words — a merchant who
 * believes they just changed 178 live prices when they did not is a worse
 * outcome than one who has to run a sync.
 */

export interface StoredMarkupRule {
  productKind: string;
  markupBps: number;
  floorCents: number;
  charmPricing: boolean;
  active: boolean;
}

/** Rules from the DB, falling back to the compiled defaults. */
export function loadMarkupRules(): MarkupRule[] {
  try {
    const rows = getDb().select().from(markupRules).all();
    if (rows.length === 0) return MARKUP_RULE_SET;

    return MARKUP_RULE_SET.map((base) => {
      const stored = rows.find((row) => row.productKind === base.kind);
      if (!stored) return base;
      return {
        ...base,
        markupBps: stored.markupBps,
        floorCents: stored.floorCents,
        charmPricing: stored.charmPricing,
        active: stored.active,
      };
    });
  } catch {
    return MARKUP_RULE_SET;
  }
}

export type SaveResult =
  | { ok: true; kind: string }
  | { ok: false; message: string };

export function saveMarkupRule(rule: StoredMarkupRule): SaveResult {
  try {
    const db = getDb();
    const existing = db
      .select({ id: markupRules.id })
      .from(markupRules)
      .where(eq(markupRules.productKind, rule.productKind))
      .get();

    if (existing) {
      db.update(markupRules)
        .set({
          markupBps: rule.markupBps,
          floorCents: rule.floorCents,
          charmPricing: rule.charmPricing,
          active: rule.active,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(markupRules.id, existing.id))
        .run();
    } else {
      db.insert(markupRules).values(rule).run();
    }

    return { ok: true, kind: rule.productKind };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Regel konnte nicht gespeichert werden',
    };
  }
}
