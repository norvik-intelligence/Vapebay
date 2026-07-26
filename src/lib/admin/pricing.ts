import { MARKUP_RULES } from '@/lib/data/catalog';
import type { ProductKind } from '@/lib/types';

/**
 * Margin & markup rules.
 *
 * Basis points, not percentages: `2000` is exactly +20 %, whereas `0.2` in a
 * float column drifts once you multiply it across a few thousand SKUs. The
 * storefront's `retailFromCost()` reads the same numbers.
 */

export interface MarkupRule {
  kind: ProductKind;
  label: string;
  markupBps: number;
  floorCents: number;
  charmPricing: boolean;
  active: boolean;
  rationale: string;
}

const LABELS: Record<ProductKind, string> = {
  device: 'Hardware / Pod-Systeme',
  disposable: 'Einweg-Vapes',
  pod: 'Ersatz-Pods',
  coil: 'Coils',
  liquid: 'Liquids (Freebase)',
  nicsalt: 'NicSalts',
  bundle: 'B2B-Bundles',
};

const RATIONALE: Record<ProductKind, string> = {
  device:
    'Hardware ist der Preisanker: Kunden vergleichen Gerätepreise direkt zwischen Shops. 20 % ist die Untergrenze, mit der die Kategorie noch trägt — verdient wird an den Verschleißteilen danach.',
  disposable:
    'Einweggeräte sind Impulskäufe mit hoher Wiederkaufrate und geringer Preissensibilität im Kiosk-Vergleich. 35 % ist marktüblich.',
  pod: 'Verschleißteile sind der eigentliche Deckungsbeitrag. Wer das Gerät hat, kauft hier gebunden nach — 45 % wird akzeptiert, solange die Kompatibilität stimmt.',
  coil: 'Wie Pods: gebundener Nachkauf, hohe Frequenz, geringe Vergleichbarkeit über Shops hinweg.',
  liquid:
    'Freebase-Liquids stehen im direkten Preisvergleich mit dem Fachhandel. 60 % bei einem EK um 2,29 € ergibt einen Endpreis, der noch unter der 4-€-Wahrnehmungsschwelle liegt.',
  nicsalt:
    'NicSalts sind das margenstärkste Segment: kleinstes Volumen, höchste Kauffrequenz, stärkste Markenbindung ans Geschmacksprofil statt an den Preis.',
  bundle:
    'B2B ist Volumengeschäft mit Nettopreisen. 15 % ist die Grenze, an der Kioske noch bei uns statt beim Direktimport kaufen.',
};

export const MARKUP_RULE_SET: MarkupRule[] = (
  Object.keys(MARKUP_RULES) as ProductKind[]
).map((kind) => ({
  kind,
  label: LABELS[kind],
  markupBps: Math.round(MARKUP_RULES[kind] * 10_000),
  floorCents: kind === 'bundle' ? 5000 : 199,
  charmPricing: true,
  active: true,
  rationale: RATIONALE[kind],
}));

/** Applies a rule to a wholesale cost. Mirrors `retailFromCost()` exactly. */
export function applyRule(costCents: number, rule: MarkupRule): number {
  const raw = costCents * (1 + rule.markupBps / 10_000);
  const floored = Math.max(raw, rule.floorCents);
  if (!rule.charmPricing) return Math.round(floored);
  const euros = Math.floor(floored / 100);
  const charm = floored % 100 < 50 ? 49 : 99;
  return euros * 100 + charm;
}

export interface MarginRow {
  kind: ProductKind;
  label: string;
  markupBps: number;
  /** Gross margin as a share of the retail price, not of cost. */
  grossMarginPct: number;
  exampleCostCents: number;
  exampleRetailCents: number;
  exampleProfitCents: number;
}

/**
 * Markup and margin are not the same number, and conflating them is the classic
 * retail pricing error: +70 % markup is a 41 % margin. The admin table shows
 * both so nobody sets a floor against the wrong one.
 */
export function marginTable(): MarginRow[] {
  const EXAMPLE_COST: Partial<Record<ProductKind, number>> = {
    device: 1680,
    disposable: 900,
    pod: 780,
    coil: 700,
    liquid: 229,
    nicsalt: 249,
    bundle: 45000,
  };

  return MARKUP_RULE_SET.map((rule) => {
    const cost = EXAMPLE_COST[rule.kind] ?? 1000;
    const retail = applyRule(cost, rule);
    return {
      kind: rule.kind,
      label: rule.label,
      markupBps: rule.markupBps,
      grossMarginPct: ((retail - cost) / retail) * 100,
      exampleCostCents: cost,
      exampleRetailCents: retail,
      exampleProfitCents: retail - cost,
    };
  });
}
