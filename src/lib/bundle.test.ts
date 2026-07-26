import { describe, expect, it } from 'vitest';

import { BUNDLE_TIERS, evaluateBundle, shippingFor, FREE_SHIPPING_CENTS } from './bundle';
import type { ProductKind } from './types';

const line = (kind: ProductKind, priceCents: number, qty = 1) => ({
  product: { kind, priceCents },
  qty,
});

/** 1 device + 2 pods + 5 liquids — the Pro tier from the brief. */
const proSet = [line('device', 2049), line('pod', 1099, 2), line('nicsalt', 499, 5)];

describe('evaluateBundle', () => {
  it('applies no discount to an empty cart', () => {
    const result = evaluateBundle([]);
    expect(result.tier).toBeNull();
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it('grants 15 % for 1 device + 2 pods + 5 liquids', () => {
    const result = evaluateBundle(proSet);
    expect(result.tier?.id).toBe('pro');
    const subtotal = 2049 + 1099 * 2 + 499 * 5;
    expect(result.subtotalCents).toBe(subtotal);
    expect(result.discountCents).toBe(Math.round(subtotal * 0.15));
    expect(result.totalCents).toBe(subtotal - result.discountCents);
  });

  it('grants 10 % for the starter combination', () => {
    const result = evaluateBundle([line('device', 2049), line('pod', 1099), line('liquid', 379, 3)]);
    expect(result.tier?.id).toBe('starter');
    expect(result.discountCents).toBe(Math.round(result.subtotalCents * 0.1));
  });

  it('awards the highest tier a cart qualifies for, not the first', () => {
    // The Pro set also satisfies every Starter requirement.
    expect(evaluateBundle(proSet).tier?.id).toBe('pro');
  });

  it('counts pods and coils interchangeably', () => {
    const withCoils = [line('device', 2049), line('coil', 1099, 2), line('nicsalt', 499, 5)];
    expect(evaluateBundle(withCoils).tier?.id).toBe('pro');
  });

  it('counts liquids and nicsalts interchangeably', () => {
    const mixed = [
      line('device', 2049),
      line('pod', 1099, 2),
      line('liquid', 379, 2),
      line('nicsalt', 499, 3),
    ];
    expect(evaluateBundle(mixed).tier?.id).toBe('pro');
  });

  it('gives no discount when a required kind is missing entirely', () => {
    // Five liquids and two pods, but no device.
    const result = evaluateBundle([line('pod', 1099, 2), line('nicsalt', 499, 5)]);
    expect(result.tier).toBeNull();
    expect(result.discountCents).toBe(0);
  });

  it('names the specific missing items rather than a bare percentage', () => {
    const result = evaluateBundle([line('device', 2049)]);
    expect(result.nextStep).toBeTruthy();
    expect(result.nextStep).toMatch(/Pod/);
    expect(result.nextStep).toMatch(/Liquid/);
  });

  it('reports no next step once the top tier is reached', () => {
    expect(evaluateBundle(proSet).nextStep).toBeNull();
  });

  it('reports completion between 0 and 1', () => {
    for (const lines of [[], [line('device', 2049)], proSet]) {
      const { completion } = evaluateBundle(lines);
      expect(completion).toBeGreaterThanOrEqual(0);
      expect(completion).toBeLessThanOrEqual(1);
    }
  });

  it('does not let excess quantity push completion above 1', () => {
    const excessive = [line('device', 2049, 9), line('pod', 1099, 9), line('nicsalt', 499, 9)];
    expect(evaluateBundle(excessive).completion).toBe(1);
  });

  it('returns integer cents — no floating point cents on an invoice', () => {
    const result = evaluateBundle(proSet);
    for (const value of [result.subtotalCents, result.discountCents, result.totalCents]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('keeps subtotal minus discount equal to total for every tier', () => {
    for (const lines of [proSet, [line('device', 2049), line('pod', 1099), line('liquid', 379, 3)]]) {
      const r = evaluateBundle(lines);
      expect(r.subtotalCents - r.discountCents).toBe(r.totalCents);
    }
  });
});

describe('BUNDLE_TIERS', () => {
  it('is ordered by ascending discount, which evaluateBundle relies on', () => {
    const discounts = BUNDLE_TIERS.map((t) => t.discount);
    expect(discounts).toEqual([...discounts].sort((a, b) => a - b));
  });

  it('matches the brief: the top tier is 15 % at 1 + 2 + 5', () => {
    const pro = BUNDLE_TIERS.find((t) => t.id === 'pro')!;
    expect(pro.discount).toBe(0.15);
    expect(pro.requirements.map((r) => r.qty)).toEqual([1, 2, 5]);
  });
});

describe('shippingFor', () => {
  it('charges shipping below the threshold', () => {
    expect(shippingFor(FREE_SHIPPING_CENTS - 1)).toBe(499);
  });

  it('is free exactly at the threshold', () => {
    expect(shippingFor(FREE_SHIPPING_CENTS)).toBe(0);
  });
});
