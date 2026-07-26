import { describe, expect, it } from 'vitest';

import {
  compatibilityFor,
  compatiblePods,
  gradedLiquids,
  recommendedNicotineMg,
  similarDevices,
} from './compat';
import { DEVICES, deviceBySlug } from './data/devices';

describe('recommendedNicotineMg', () => {
  it('recommends the lower strength for low-resistance coils', () => {
    // A 0.6 Ohm coil vaporises roughly twice the liquid per puff, so the same
    // nicotine hit needs half the concentration. Getting this backwards is the
    // single most uncomfortable mistake a new vaper can make.
    expect(recommendedNicotineMg(0.6)).toBe(10);
    expect(recommendedNicotineMg(0.8)).toBe(10);
  });

  it('recommends the higher strength for tight, high-resistance coils', () => {
    expect(recommendedNicotineMg(1.0)).toBe(20);
    expect(recommendedNicotineMg(1.2)).toBe(20);
  });

  it('switches exactly at 0.8 Ohm', () => {
    expect(recommendedNicotineMg(0.8)).toBe(10);
    expect(recommendedNicotineMg(0.81)).toBe(20);
  });
});

describe('compatiblePods', () => {
  it('returns only pods of the device own family', () => {
    const device = deviceBySlug('vaporesso-xros-3')!;
    const pods = compatiblePods(device.slug);
    expect(pods.length).toBeGreaterThan(0);
    for (const pod of pods) {
      expect(pod.podFamilies, pod.id).toContain(device.podFamily);
    }
  });

  it('never crosses device families, even when both are magnetic', () => {
    // An XROS pod physically sticks to a Caliburn. It does not fire. This is
    // the exact mistake the whole site exists to prevent.
    const xros = compatiblePods('vaporesso-xros-3').map((p) => p.id);
    const caliburn = compatiblePods('uwell-caliburn-g3').map((p) => p.id);
    expect(xros.some((id) => caliburn.includes(id))).toBe(false);
  });

  it('shares pods between devices of the same family', () => {
    // XROS 3 and XROS 4 Mini take the same pod without an adapter.
    const three = compatiblePods('vaporesso-xros-3').map((p) => p.id).sort();
    const four = compatiblePods('vaporesso-xros-4-mini').map((p) => p.id).sort();
    expect(three).toEqual(four);
  });

  it('filters to a single resistance when one is given', () => {
    const pods = compatiblePods('vaporesso-xros-3', 0.6);
    expect(pods.length).toBeGreaterThan(0);
    for (const pod of pods) expect(pod.coilOhm).toBe(0.6);
  });

  it('returns nothing for a disposable — there is nothing to replace', () => {
    expect(compatiblePods('randm-tornado-9000')).toEqual([]);
  });

  it('returns nothing for an unknown device rather than throwing', () => {
    expect(compatiblePods('gibt-es-nicht')).toEqual([]);
  });
});

describe('gradedLiquids', () => {
  it('grades rather than filters — every liquid is still present', () => {
    const graded = gradedLiquids('vaporesso-xros-3', 0.6);
    expect(graded.length).toBeGreaterThan(20);
    expect(new Set(graded.map((g) => g.level)).size).toBeGreaterThan(1);
  });

  it('marks the recommended strength as a perfect fit', () => {
    const graded = gradedLiquids('vaporesso-xros-3', 1.0);
    const perfect = graded.filter((g) => g.level === 'perfect');
    expect(perfect.length).toBeGreaterThan(0);
    for (const fit of perfect) {
      expect(fit.product.nicotineMg).toBe(20);
    }
  });

  it('sorts perfect fits ahead of good ones, and good ahead of poor', () => {
    const order = { perfect: 0, good: 1, poor: 2 };
    const levels = gradedLiquids('uwell-caliburn-g3').map((g) => order[g.level]);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('gives every grade a human-readable reason, never a bare score', () => {
    for (const fit of gradedLiquids('vaporesso-xros-3', 0.6)) {
      expect(fit.reason.length, fit.product.id).toBeGreaterThan(20);
      expect(fit.reason).not.toMatch(/score/i);
    }
  });
});

describe('compatibilityFor', () => {
  it('returns null for an unknown device', () => {
    expect(compatibilityFor('gibt-es-nicht')).toBeNull();
  });

  it('offers a refillable upgrade path for disposables', () => {
    const report = compatibilityFor('lost-mary-bm600')!;
    expect(report.pods).toEqual([]);
    expect(report.upgradePath).not.toBeNull();
    expect(report.upgradePath!.podFamily).not.toBe('disposable');
    // The suggestion has to match the draw style, or it is not a substitute.
    expect(report.upgradePath!.drawStyle).toBe(report.device.drawStyle);
  });

  it('has no upgrade path for a device that is already refillable', () => {
    expect(compatibilityFor('vaporesso-xros-3')!.upgradePath).toBeNull();
  });

  it('derives the recommended strength from the selected resistance', () => {
    expect(compatibilityFor('vaporesso-xros-3', 0.6)!.recommendedMg).toBe(10);
    expect(compatibilityFor('vaporesso-xros-3', 1.0)!.recommendedMg).toBe(20);
  });
});

describe('similarDevices', () => {
  it('never suggests the device itself', () => {
    for (const device of DEVICES) {
      const similar = similarDevices(device.slug);
      expect(similar.map((d) => d.slug), device.slug).not.toContain(device.slug);
    }
  });

  it('returns at most the requested number', () => {
    expect(similarDevices('vaporesso-xros-3', 2).length).toBe(2);
  });
});
