import type { CategorySlug, Product, ProductKind } from '@/lib/types';
import { DEVICES } from './devices';
import { FLAVOURS } from './flavours';
import { BRANDS } from './brands';

/**
 * The catalog is *derived*, not hand-listed.
 *
 * Every liquid is the product of (brand × flavour × nicotine strength) and every
 * pod is (device family × resistance). That guarantees the pSEO routes can never
 * 404 on a combination the navigation offers — the same matrix generates both.
 * Hand-maintaining ~250 rows would drift from the route generators within a week.
 *
 * Everything below is deterministic: same input, same ids, same prices, same
 * "random" ratings. Static generation depends on that.
 */

/** FNV-1a. Small, fast, and stable across Node versions — Math.random is not. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic integer in [min, max]. */
const pick = (seed: string, min: number, max: number) => min + (hash(seed) % (max - min + 1));

/**
 * Markup rules — the storefront's single source of truth for price.
 * The admin "Margen & Aufschlag" screen edits these same numbers, so a rule
 * change there is visible on the shop immediately rather than needing a
 * separate price column to be re-synced.
 */
export const MARKUP_RULES: Record<ProductKind, number> = {
  device: 0.2,
  disposable: 0.35,
  pod: 0.45,
  coil: 0.45,
  liquid: 0.6,
  nicsalt: 0.7,
  bundle: 0.15,
};

/** Applies the category markup and lands the result on a .49/.99 charm price. */
function retailFromCost(costCents: number, kind: ProductKind): number {
  const raw = costCents * (1 + MARKUP_RULES[kind]);
  const euros = Math.floor(raw / 100);
  const charm = raw % 100 < 50 ? 49 : 99;
  return euros * 100 + charm;
}

function baseProduct(
  seed: string,
  fields: Omit<Product, 'rating' | 'reviewCount' | 'hue' | 'stock'> & { stock?: number },
): Product {
  return {
    ...fields,
    stock: fields.stock ?? pick(`${seed}:stock`, 0, 240),
    rating: Math.round((38 + (hash(`${seed}:rate`) % 13)) / 10 * 10) / 10,
    reviewCount: pick(`${seed}:rev`, 8, 940),
    hue: hash(`${seed}:hue`) % 360,
  };
}

// ── Geräte & Einweg-Vapes ──────────────────────────────────────────────────

const deviceProducts: Product[] = DEVICES.map((device) => {
  const isDisposable = device.podFamily === 'disposable';
  const kind: ProductKind = isDisposable ? 'disposable' : 'device';
  const category: CategorySlug = isDisposable ? 'einweg-vapes' : 'pod-systeme';
  const seed = `dev:${device.slug}`;

  // Disposables scale with puff count; hardware with battery and features.
  const costCents = isDisposable
    ? 320 + Math.round(device.podCapacityMl * 38)
    : 780 + Math.round(device.batteryMah * 0.9);

  const puffs = isDisposable ? Math.round(device.podCapacityMl * 500) : null;
  const priceCents = retailFromCost(costCents, kind);

  return baseProduct(seed, {
    id: seed,
    slug: device.slug,
    name: device.name,
    kind,
    brandSlug: device.brandSlug,
    categorySlug: category,
    priceCents,
    compareAtCents: hash(`${seed}:sale`) % 3 === 0 ? Math.round(priceCents * 1.25) : null,
    costCents,
    flavourSlug: null,
    nicotineMg: isDisposable ? 20 : null,
    vg: isDisposable ? 50 : null,
    volumeMl: isDisposable ? Math.min(device.podCapacityMl, 2) : null,
    coilOhm: isDisposable ? device.coilOhms[0] : null,
    podFamilies: isDisposable ? [] : [device.podFamily],
    deviceSlug: device.slug,
    puffs,
    packSize: 1,
    b2bMinQty: isDisposable ? 50 : 20,
    b2bUnitCents: Math.round(costCents * 1.12),
    tags: [
      device.drawStyle,
      isDisposable ? 'Einweg' : 'Nachfüllbar',
      ...(device.releaseYear >= 2024 ? ['Neu'] : []),
    ],
    summary: device.summary,
  });
});

// ── Ersatz-Pods & Coils ────────────────────────────────────────────────────

const podProducts: Product[] = DEVICES.filter((d) => d.podFamily !== 'disposable')
  .flatMap((device) => device.coilOhms.map((ohm) => ({ device, ohm })))
  // One device family can appear on several devices (XROS 3 / XROS 4 Mini share
  // "xros"). Dedupe on family+ohm so we don't list the same pod twice.
  .filter(
    (entry, index, all) =>
      all.findIndex(
        (o) => o.device.podFamily === entry.device.podFamily && o.ohm === entry.ohm,
      ) === index,
  )
  .map(({ device, ohm }) => {
    const seed = `pod:${device.podFamily}:${ohm}`;
    const costCents = 640 + Math.round((1.4 - ohm) * 260);
    const priceCents = retailFromCost(costCents, 'pod');
    const familyLabel = device.name.replace(/\s+\d.*$/, '');

    return baseProduct(seed, {
      id: seed,
      slug: `${device.podFamily}-pod-${String(ohm).replace('.', '-')}-ohm`,
      name: `${familyLabel} Pod ${ohm.toFixed(1)} Ohm (2er Pack)`,
      kind: 'pod',
      brandSlug: device.brandSlug,
      categorySlug: 'ersatz-pods-coils',
      priceCents,
      compareAtCents: null,
      costCents,
      flavourSlug: null,
      nicotineMg: null,
      vg: null,
      volumeMl: device.podCapacityMl,
      coilOhm: ohm,
      podFamilies: [device.podFamily],
      deviceSlug: null,
      puffs: null,
      packSize: 2,
      b2bMinQty: 100,
      b2bUnitCents: Math.round(costCents * 1.1),
      tags: [
        ohm <= 0.7 ? 'Mehr Dampf' : ohm >= 1.0 ? 'Straffer Zug' : 'Ausgewogen',
        'Mesh-Coil',
      ],
      summary: `Original ${familyLabel} Ersatzpod mit ${ohm.toFixed(1)} Ohm Mesh-Coil. ${
        ohm <= 0.7
          ? 'Niedriger Widerstand für mehr Dampf und wärmeren Zug — ideal mit 10 mg NicSalt.'
          : 'Höherer Widerstand für straffen MTL-Zug und geringen Liquidverbrauch — ideal mit 20 mg NicSalt.'
      }`,
    });
  });

// ── Liquids & NicSalts ─────────────────────────────────────────────────────

/** Brands that actually bottle liquid, rather than only building hardware. */
const LIQUID_BRANDS = ['al-fakher', 'elfbar', 'lost-mary'] as const;

const liquidProducts: Product[] = LIQUID_BRANDS.flatMap((brandSlug) =>
  FLAVOURS.flatMap((flavour) => {
    const brand = BRANDS.find((b) => b.slug === brandSlug)!;

    // NicSalts in the two TPD2-relevant strengths, plus one freebase 3 mg.
    const nicsalts: Product[] = [10, 20].map((mg) => {
      const seed = `nic:${brandSlug}:${flavour.slug}:${mg}`;
      const costCents = 249 + (mg === 20 ? 30 : 0);
      const priceCents = retailFromCost(costCents, 'nicsalt');
      return baseProduct(seed, {
        id: seed,
        slug: `${brandSlug}-${flavour.slug}-nicsalt-${mg}mg`,
        name: `${brand.name} ${flavour.name} NicSalt ${mg} mg`,
        kind: 'nicsalt',
        brandSlug,
        categorySlug: 'nicsalts',
        priceCents,
        compareAtCents: null,
        costCents,
        flavourSlug: flavour.slug,
        nicotineMg: mg,
        vg: 50,
        volumeMl: 10,
        coilOhm: null,
        podFamilies: [],
        deviceSlug: null,
        puffs: null,
        packSize: 1,
        b2bMinQty: 100,
        b2bUnitCents: Math.round(costCents * 1.08),
        tags: ['50/50 PG/VG', `${mg} mg/ml`, 'Nikotinsalz'],
        summary: `${flavour.description} Nikotinsalz mit weichem Throat Hit bei ${mg} mg/ml — ${
          mg === 20 ? 'die Umsteiger-Stärke für Pods ab 1.0 Ohm.' : 'ideal für Coils unter 0.8 Ohm.'
        }`,
      });
    });

    const freebase = baseProduct(`liq:${brandSlug}:${flavour.slug}:3`, {
      id: `liq:${brandSlug}:${flavour.slug}:3`,
      slug: `${brandSlug}-${flavour.slug}-liquid-3mg`,
      name: `${brand.name} ${flavour.name} Liquid 3 mg`,
      kind: 'liquid',
      brandSlug,
      categorySlug: 'liquids',
      priceCents: retailFromCost(229, 'liquid'),
      compareAtCents: null,
      costCents: 229,
      flavourSlug: flavour.slug,
      nicotineMg: 3,
      vg: 50,
      volumeMl: 10,
      coilOhm: null,
      podFamilies: [],
      deviceSlug: null,
      puffs: null,
      packSize: 1,
      b2bMinQty: 100,
      b2bUnitCents: 247,
      tags: ['50/50 PG/VG', '3 mg/ml', 'Freebase'],
      summary: `${flavour.description} Freebase-Variante mit 3 mg/ml für Dampfer, die den Nikotinanteil bereits reduziert haben.`,
    });

    return [...nicsalts, freebase];
  }),
);

// ── B2B Grossmengen-Bundles ────────────────────────────────────────────────

const b2bProducts: Product[] = [
  {
    key: 'randm-tornado-9000',
    qty: 50,
    name: 'RandM Tornado 9000 — 50er Display',
    brandSlug: 'randm',
    summary:
      'Gemischtes 50er Display mit den zehn meistverkauften Sorten. Netto-Preis, Lieferung in 48 h, auf Wunsch als Blind-Dropshipping direkt an deinen Endkunden.',
  },
  {
    key: 'lost-mary-bm600',
    qty: 100,
    name: 'Lost Mary BM600 — 100er Karton',
    brandSlug: 'lost-mary',
    summary:
      'Kartonware der meistverkauften Einweg-Vape Deutschlands. Frei wählbare Sortenverteilung ab 10 Stück je Sorte.',
  },
  {
    key: 'al-fakher-crown-bar-10000',
    qty: 50,
    name: 'Al Fakher Crown Bar 10000 — 50er Display',
    brandSlug: 'al-fakher',
    summary:
      'Das Shisha-Bar-Display. Besonders starke Abverkaufszahlen in Gastronomie und Shisha-Lounges.',
  },
  {
    key: 'nicsalt-mixed',
    qty: 200,
    name: 'NicSalt Mixed Case — 200 × 10 ml',
    brandSlug: 'al-fakher',
    summary:
      'Querschnitt durch alle 16 Geschmacksrichtungen in 10 und 20 mg. Der Standardnachschub für Fachhandel und Kiosk.',
  },
].map(({ key, qty, name, brandSlug, summary }) => {
  const seed = `b2b:${key}:${qty}`;
  const unitCost = key === 'nicsalt-mixed' ? 232 : 900;
  const costCents = unitCost * qty;
  const priceCents = Math.round(costCents * 1.15);

  return baseProduct(seed, {
    id: seed,
    slug: `b2b-${key}-${qty}`,
    name,
    kind: 'bundle',
    brandSlug,
    categorySlug: 'b2b-bundles',
    priceCents,
    compareAtCents: Math.round(priceCents * 1.3),
    costCents,
    flavourSlug: null,
    nicotineMg: null,
    vg: null,
    volumeMl: null,
    coilOhm: null,
    podFamilies: [],
    deviceSlug: null,
    puffs: null,
    packSize: qty,
    b2bMinQty: 1,
    b2bUnitCents: Math.round(priceCents / qty),
    tags: ['B2B', 'Netto', 'Blind-Dropshipping'],
    summary,
    stock: pick(`${seed}:stock`, 4, 40),
  });
});

export const PRODUCTS: Product[] = [
  ...deviceProducts,
  ...podProducts,
  ...liquidProducts,
  ...b2bProducts,
];

// ── Lookups ────────────────────────────────────────────────────────────────

const bySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

export const productBySlug = (slug: string) => bySlug.get(slug);
export const productById = (id: string) => byId.get(id);
export const productsByIds = (ids: string[]) =>
  ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));

export const productsByCategory = (slug: CategorySlug) =>
  PRODUCTS.filter((p) => p.categorySlug === slug);

export const productsByBrand = (slug: string) => PRODUCTS.filter((p) => p.brandSlug === slug);

export const productsByFlavour = (slug: string) => PRODUCTS.filter((p) => p.flavourSlug === slug);

/**
 * Storefront-safe projection. `costCents` is wholesale data — it must never
 * reach a client bundle, and the type system won't stop us from passing a whole
 * Product into a client component, so we strip it at the boundary.
 */
export type PublicProduct = Omit<Product, 'costCents' | 'b2bUnitCents'>;

export function toPublic(product: Product): PublicProduct {
  const { costCents: _cost, b2bUnitCents: _b2b, ...rest } = product;
  return rest;
}

export const publicProducts = (items: Product[]): PublicProduct[] => items.map(toPublic);
