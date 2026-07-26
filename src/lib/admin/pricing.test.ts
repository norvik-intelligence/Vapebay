import { describe, expect, it } from 'vitest';

import { MARKUP_RULE_SET, applyRule, marginTable } from './pricing';
import { PRODUCTS, MARKUP_RULES } from '@/lib/data/catalog';

const rule = (kind: string) => MARKUP_RULE_SET.find((r) => r.kind === kind)!;

describe('applyRule', () => {
  it('lands on a charm price when charm pricing is on', () => {
    for (const cost of [199, 249, 780, 1680, 4999]) {
      const price = applyRule(cost, rule('nicsalt'));
      expect([49, 99], `cost ${cost} → ${price}`).toContain(price % 100);
    }
  });

  it('returns an exact rounded value when charm pricing is off', () => {
    const plain = { ...rule('device'), charmPricing: false };
    expect(applyRule(1000, plain)).toBe(1200);
  });

  it('never returns a price below the floor', () => {
    const floored = { ...rule('liquid'), floorCents: 500, charmPricing: false };
    expect(applyRule(10, floored)).toBe(500);
  });

  it('is monotonic — a higher cost never yields a lower price', () => {
    let previous = 0;
    for (let cost = 100; cost <= 5000; cost += 37) {
      const price = applyRule(cost, rule('pod'));
      expect(price, `cost ${cost}`).toBeGreaterThanOrEqual(previous);
      previous = price;
    }
  });

  it('returns integer cents', () => {
    for (const r of MARKUP_RULE_SET) {
      expect(Number.isInteger(applyRule(1234, r)), r.kind).toBe(true);
    }
  });
});

describe('markup vs. margin', () => {
  it('reports margin on revenue, not on cost', () => {
    // The classic retail error: +70 % markup is a 41 % margin, not 70 %.
    // Setting a floor against the wrong number loses money on every order.
    const nicsalt = marginTable().find((row) => row.kind === 'nicsalt')!;
    expect(nicsalt.markupBps).toBe(7000);
    expect(nicsalt.grossMarginPct).toBeGreaterThan(35);
    expect(nicsalt.grossMarginPct).toBeLessThan(50);
  });

  it('keeps profit equal to retail minus cost in every row', () => {
    for (const row of marginTable()) {
      expect(row.exampleProfitCents, row.kind).toBe(row.exampleRetailCents - row.exampleCostCents);
    }
  });

  it('produces a positive margin for every configured rule', () => {
    for (const row of marginTable()) {
      expect(row.grossMarginPct, row.kind).toBeGreaterThan(0);
      expect(row.exampleRetailCents, row.kind).toBeGreaterThan(row.exampleCostCents);
    }
  });
});

describe('rule set and catalog agree', () => {
  it('exposes exactly one rule per product kind the catalog prices', () => {
    expect(MARKUP_RULE_SET.map((r) => r.kind).sort()).toEqual(Object.keys(MARKUP_RULES).sort());
  });

  it('converts each catalog markup to basis points without loss', () => {
    for (const r of MARKUP_RULE_SET) {
      expect(r.markupBps, r.kind).toBe(Math.round(MARKUP_RULES[r.kind] * 10_000));
    }
  });

  it('prices every catalog product above its cost', () => {
    // A rounding rule that ever inverted this would sell at a loss silently.
    for (const product of PRODUCTS) {
      expect(product.priceCents, product.id).toBeGreaterThan(product.costCents);
    }
  });
});
