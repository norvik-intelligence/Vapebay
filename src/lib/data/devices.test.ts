import { describe, expect, it } from 'vitest';

import { DEVICES, coilSegment, parseCoilSegment, deviceBySlug } from './devices';
import { compatibilityRoutes } from '@/lib/seo/pseo';

describe('coilSegment / parseCoilSegment', () => {
  it('round-trips every resistance in the device registry', () => {
    // This is the regression guard for the shipped bug: String(1.0) is "1",
    // so coilSegment(1.0) produced "1-ohm-pod", which the parser rejected.
    // generateStaticParams happily built the page and every request 404'd.
    for (const device of DEVICES) {
      for (const ohm of device.coilOhms) {
        expect(parseCoilSegment(coilSegment(ohm)), `${device.slug} @ ${ohm}`).toBe(ohm);
      }
    }
  });

  it('encodes a whole-number resistance with its decimal place', () => {
    expect(coilSegment(1.0)).toBe('1-0-ohm-pod');
    expect(coilSegment(0.6)).toBe('0-6-ohm-pod');
    expect(coilSegment(1.2)).toBe('1-2-ohm-pod');
  });

  it('still parses the legacy decimal-less form so old links do not 404', () => {
    expect(parseCoilSegment('1-ohm-pod')).toBe(1);
  });

  it('rejects malformed segments instead of coercing them', () => {
    for (const bad of ['', 'ohm-pod', 'abc-ohm-pod', '0-6-ohm', '0..6-ohm-pod', '0-6-ohm-pod-x']) {
      expect(parseCoilSegment(bad), bad).toBeNull();
    }
  });
});

describe('device registry integrity', () => {
  it('has unique slugs', () => {
    const slugs = DEVICES.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('keeps every ideal VG inside its own tolerance window', () => {
    for (const device of DEVICES) {
      const [min, max] = device.vgRange;
      expect(min, device.slug).toBeLessThanOrEqual(max);
      expect(device.idealVg, device.slug).toBeGreaterThanOrEqual(min);
      expect(device.idealVg, device.slug).toBeLessThanOrEqual(max);
    }
  });

  it('caps nicotine at the TPD2 limit of 20 mg/ml', () => {
    for (const device of DEVICES) {
      expect(device.maxNicotineMg, device.slug).toBeLessThanOrEqual(20);
    }
  });

  it('emits compatibility routes only for refillable devices', () => {
    for (const route of compatibilityRoutes()) {
      const device = deviceBySlug(route.deviceSlug);
      expect(device, route.deviceSlug).toBeDefined();
      expect(device!.podFamily).not.toBe('disposable');
    }
  });

  it('emits a route for every resistance the device accepts, and no others', () => {
    const routes = compatibilityRoutes();
    for (const device of DEVICES.filter((d) => d.podFamily !== 'disposable')) {
      const mine = routes.filter((r) => r.deviceSlug === device.slug);
      expect(mine.length, device.slug).toBe(device.coilOhms.length);
      for (const route of mine) {
        expect(device.coilOhms).toContain(parseCoilSegment(route.coilOhm));
      }
    }
  });
});
