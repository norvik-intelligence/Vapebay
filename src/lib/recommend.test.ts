import { describe, expect, it } from 'vitest';

import { TasteAnswersSchema, recommend, type TasteAnswers } from './recommend';
import { FLAVOURS } from './data/flavours';

const answers = (overrides: Partial<TasteAnswers> = {}): TasteAnswers => ({
  smokerType: 'umsteiger',
  profiles: ['fruchtig', 'eis'],
  nicotine: '20',
  ...overrides,
});

describe('TasteAnswersSchema', () => {
  it('rejects an empty profile selection', () => {
    expect(TasteAnswersSchema.safeParse(answers({ profiles: [] })).success).toBe(false);
  });

  it('rejects more than three profiles', () => {
    const tooMany = { ...answers(), profiles: ['fruchtig', 'eis', 'suess', 'minze'] };
    expect(TasteAnswersSchema.safeParse(tooMany).success).toBe(false);
  });

  it('rejects unknown enum values instead of coercing them', () => {
    expect(TasteAnswersSchema.safeParse(answers({ nicotine: '50' as never }).nicotine).success).toBe(
      false,
    );
    expect(
      TasteAnswersSchema.safeParse({ ...answers(), smokerType: 'raucher' }).success,
    ).toBe(false);
  });
});

describe('recommend', () => {
  it('gives a switcher an MTL device at 20 mg/ml', () => {
    const result = recommend(answers({ smokerType: 'umsteiger', nicotine: '20' }));
    expect(result.drawStyle).toBe('MTL');
    expect(result.nicotineMg).toBe(20);
  });

  it('derives a strength when the visitor says they do not know', () => {
    const switcher = recommend(answers({ smokerType: 'umsteiger', nicotine: 'unsicher' }));
    const curious = recommend(answers({ smokerType: 'neugierig', nicotine: 'unsicher' }));
    expect(switcher.nicotineMg).toBe(20);
    expect(curious.nicotineMg).toBe(10);
  });

  it('honours an explicit strength over the derived default', () => {
    expect(recommend(answers({ smokerType: 'umsteiger', nicotine: '3' })).nicotineMg).toBe(3);
  });

  it('only suggests flavours matching a requested profile', () => {
    const result = recommend(answers({ profiles: ['tabak'] }));
    expect(result.matchedFlavours.length).toBeGreaterThan(0);
    for (const match of result.matchedFlavours) {
      const flavour = FLAVOURS.find((f) => f.slug === match.slug)!;
      expect(flavour.profiles, match.slug).toContain('tabak');
    }
  });

  it('never repeats a flavour across the recommended liquids', () => {
    const slugs = recommend(answers()).bundle.liquids.map((p) => p.flavourSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('never recommends an out-of-stock product', () => {
    for (const type of ['umsteiger', 'gelegenheit', 'erfahren', 'neugierig'] as const) {
      const result = recommend(answers({ smokerType: type }));
      for (const product of [...result.products, ...result.bundle.liquids]) {
        expect(product.stock, `${type} → ${product.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('only pairs pods that fit the recommended device', () => {
    const result = recommend(answers({ smokerType: 'erfahren' }));
    const device = result.bundle.device;
    if (device && result.bundle.pods.length > 0) {
      for (const pod of result.bundle.pods) {
        expect(pod.podFamilies.some((f) => device.podFamilies.includes(f)), pod.id).toBe(true);
      }
    }
  });

  it('never leaks wholesale cost into the response', () => {
    // The whole point of scoring server-side is that the client gets a small,
    // safe payload — not the catalog with purchase prices attached.
    const serialized = JSON.stringify(recommend(answers()));
    expect(serialized).not.toContain('costCents');
    expect(serialized).not.toContain('b2bUnitCents');
  });

  it('keeps the discounted price consistent with the stated saving', () => {
    const { bundle } = recommend(answers());
    expect(bundle.subtotalCents - bundle.discountedCents).toBe(bundle.savingsCents);
    expect(bundle.discountedCents).toBeLessThanOrEqual(bundle.subtotalCents);
  });

  it('returns a rationale for every smoker type', () => {
    for (const type of ['umsteiger', 'gelegenheit', 'erfahren', 'neugierig'] as const) {
      expect(recommend(answers({ smokerType: type })).rationale.length, type).toBeGreaterThan(40);
    }
  });

  it('produces a recommendation for every single-profile answer', () => {
    for (const profile of ['fruchtig', 'suess', 'eis', 'minze', 'tabak', 'getraenk'] as const) {
      const result = recommend(answers({ profiles: [profile] }));
      expect(result.matchedFlavours.length, profile).toBeGreaterThan(0);
      expect(result.products.length, profile).toBeGreaterThan(0);
    }
  });
});
