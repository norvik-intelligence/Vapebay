import { PRODUCTS } from '@/lib/data/catalog';
import { DEVICES, deviceBySlug } from '@/lib/data/devices';
import type { Device, Product } from '@/lib/types';

/**
 * The compatibility engine.
 *
 * Everything here is pure and synchronous so it can run at build time for the
 * pSEO routes and in a server component for the interactive finder, without a
 * second implementation drifting out of sync.
 */

export type FitLevel = 'perfect' | 'good' | 'poor';

export interface FitResult {
  product: Product;
  level: FitLevel;
  /** Human-readable justification. Shown verbatim in the UI — no "score: 0.82". */
  reason: string;
}

/**
 * Nikotinstärke ist eine Funktion des Widerstands, nicht der Vorliebe:
 * ein 0.6-Ohm-Coil verdampft rund doppelt so viel Liquid pro Zug wie ein
 * 1.2-Ohm-Coil. 20 mg auf 0.6 Ohm ist für die meisten Dampfer unangenehm hart.
 */
export function recommendedNicotineMg(ohm: number): 10 | 20 {
  return ohm <= 0.8 ? 10 : 20;
}

export function nicotineRationale(ohm: number): string {
  return ohm <= 0.8
    ? `Bei ${ohm.toFixed(1)} Ohm verdampft deutlich mehr Liquid pro Zug. 10 mg/ml liefert hier denselben Nikotinflash wie 20 mg in einem straffen Pod — ohne zu kratzen.`
    : `${ohm.toFixed(1)} Ohm erzeugt einen straffen, zigarettenähnlichen Zug mit geringem Liquidverbrauch. 20 mg/ml ist die passende Stärke für Umsteiger.`;
}

/** Pods and coils that physically fit — a hard yes/no, never a suggestion. */
export function compatiblePods(deviceSlug: string, ohm?: number): Product[] {
  const device = deviceBySlug(deviceSlug);
  if (!device || device.podFamily === 'disposable') return [];

  return PRODUCTS.filter(
    (p) =>
      (p.kind === 'pod' || p.kind === 'coil') &&
      p.podFamilies.includes(device.podFamily) &&
      (ohm === undefined || p.coilOhm === ohm),
  ).sort((a, b) => (a.coilOhm ?? 0) - (b.coilOhm ?? 0));
}

/**
 * Liquids are graded rather than filtered: an out-of-window VG still works, it
 * just performs worse. Hiding it would be dishonest and would gut the catalog
 * on every liquid page.
 */
export function gradedLiquids(deviceSlug: string, ohm?: number): FitResult[] {
  const device = deviceBySlug(deviceSlug);
  if (!device) return [];

  const targetOhm = ohm ?? device.coilOhms[Math.floor(device.coilOhms.length / 2)];
  const idealMg = recommendedNicotineMg(targetOhm);
  const [vgMin, vgMax] = device.vgRange;

  return PRODUCTS.filter((p) => p.kind === 'liquid' || p.kind === 'nicsalt')
    .map((product): FitResult => {
      const vg = product.vg ?? 50;
      const inVgWindow = vg >= vgMin && vg <= vgMax;
      const mgMatches = product.nicotineMg === idealMg;

      if (!inVgWindow) {
        return {
          product,
          level: 'poor',
          reason: `${100 - vg}/${vg} PG/VG liegt außerhalb des Fensters der ${device.name} (${100 - vgMax}/${vgMax} bis ${100 - vgMin}/${vgMin}). Der Coil kann fluten oder trocken laufen.`,
        };
      }
      if (mgMatches) {
        return {
          product,
          level: 'perfect',
          reason: `${100 - vg}/${vg} PG/VG und ${product.nicotineMg} mg/ml — exakt die Empfehlung für ${targetOhm.toFixed(1)} Ohm.`,
        };
      }
      return {
        product,
        level: 'good',
        reason: `Konsistenz passt. ${product.nicotineMg} mg/ml ist bei ${targetOhm.toFixed(1)} Ohm ${
          (product.nicotineMg ?? 0) > idealMg ? 'kräftiger' : 'milder'
        } als empfohlen (${idealMg} mg/ml).`,
      };
    })
    .sort((a, b) => {
      const order: Record<FitLevel, number> = { perfect: 0, good: 1, poor: 2 };
      return order[a.level] - order[b.level] || b.product.rating - a.product.rating;
    });
}

export interface CompatibilityReport {
  device: Device;
  ohm: number | null;
  pods: Product[];
  liquids: FitResult[];
  perfectLiquids: FitResult[];
  recommendedMg: 10 | 20;
  /** For disposables: the nearest refillable device, so the page still converts. */
  upgradePath: Device | null;
}

export function compatibilityFor(deviceSlug: string, ohm?: number): CompatibilityReport | null {
  const device = deviceBySlug(deviceSlug);
  if (!device) return null;

  const targetOhm = ohm ?? null;
  const effectiveOhm = ohm ?? device.coilOhms[Math.floor(device.coilOhms.length / 2)];
  const liquids = gradedLiquids(deviceSlug, ohm);

  return {
    device,
    ohm: targetOhm,
    pods: compatiblePods(deviceSlug, ohm),
    liquids,
    perfectLiquids: liquids.filter((l) => l.level === 'perfect'),
    recommendedMg: recommendedNicotineMg(effectiveOhm),
    upgradePath:
      device.podFamily === 'disposable'
        ? (DEVICES.filter((d) => d.podFamily !== 'disposable' && d.drawStyle === device.drawStyle).sort(
            (a, b) => b.popularity - a.popularity,
          )[0] ?? null)
        : null,
  };
}

/** "Wenn du X dampfst, passt auch Y" — cross-sell across device families. */
export function similarDevices(deviceSlug: string, limit = 3): Device[] {
  const device = deviceBySlug(deviceSlug);
  if (!device) return [];
  return DEVICES.filter((d) => d.slug !== device.slug)
    .map((d) => ({
      device: d,
      score:
        (d.drawStyle === device.drawStyle ? 3 : 0) +
        (d.refillable === device.refillable ? 2 : 0) +
        (d.brandSlug === device.brandSlug ? 1 : 0) +
        d.popularity / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.device);
}
