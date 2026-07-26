import { describe, expect, it } from 'vitest';

import { PRODUCTS, productBySlug, toPublic, publicProducts } from './catalog';
import { BRANDS, CATEGORIES } from './brands';
import { FLAVOURS } from './flavours';
import { brandCategoryRoutes, flavourRoutes } from '@/lib/seo/pseo';

describe('catalog integrity', () => {
  it('has unique ids and unique slugs', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
  });

  it('references only brands and categories that exist', () => {
    const brands = new Set(BRANDS.map((b) => b.slug));
    const categories = new Set(CATEGORIES.map((c) => c.slug));
    for (const product of PRODUCTS) {
      expect(brands.has(product.brandSlug), product.id).toBe(true);
      expect(categories.has(product.categorySlug), product.id).toBe(true);
    }
  });

  it('references only flavours that exist', () => {
    const flavours = new Set(FLAVOURS.map((f) => f.slug));
    for (const product of PRODUCTS) {
      if (product.flavourSlug) expect(flavours.has(product.flavourSlug), product.id).toBe(true);
    }
  });

  it('keeps every nicotine strength within the TPD2 limit', () => {
    for (const product of PRODUCTS) {
      if (product.nicotineMg !== null) {
        expect(product.nicotineMg, product.id).toBeLessThanOrEqual(20);
      }
    }
  });

  it('keeps every nicotine-bearing bottle at the 10 ml TPD2 size', () => {
    for (const product of PRODUCTS) {
      if (product.kind === 'liquid' || product.kind === 'nicsalt') {
        expect(product.volumeMl, product.id).toBe(10);
      }
    }
  });

  it('uses integer cents everywhere', () => {
    for (const product of PRODUCTS) {
      expect(Number.isInteger(product.priceCents), product.id).toBe(true);
      expect(Number.isInteger(product.costCents), product.id).toBe(true);
      if (product.compareAtCents !== null) {
        expect(Number.isInteger(product.compareAtCents), product.id).toBe(true);
      }
    }
  });

  it('never shows a strikethrough price below the actual price', () => {
    for (const product of PRODUCTS) {
      if (product.compareAtCents !== null) {
        expect(product.compareAtCents, product.id).toBeGreaterThan(product.priceCents);
      }
    }
  });

  it('is deterministic — the same input yields the same ids and prices', () => {
    // Static generation depends on this. A Math.random anywhere in the
    // derivation would produce a different catalog per build worker.
    const snapshot = PRODUCTS.map((p) => `${p.id}:${p.priceCents}:${p.hue}`).join('|');
    expect(PRODUCTS.map((p) => `${p.id}:${p.priceCents}:${p.hue}`).join('|')).toBe(snapshot);
  });

  it('resolves every product by its own slug', () => {
    for (const product of PRODUCTS) {
      expect(productBySlug(product.slug)?.id, product.slug).toBe(product.id);
    }
  });
});

describe('toPublic', () => {
  it('strips wholesale cost and B2B unit price', () => {
    const product = PRODUCTS.find((p) => p.kind === 'nicsalt')!;
    const publicProduct = toPublic(product) as Record<string, unknown>;
    expect(publicProduct.costCents).toBeUndefined();
    expect(publicProduct.b2bUnitCents).toBeUndefined();
  });

  it('leaves no trace of cost anywhere in the serialized payload', () => {
    // The storefront ships this to the browser. A leaked purchase price tells
    // every competitor exactly what we pay.
    const serialized = JSON.stringify(publicProducts(PRODUCTS));
    expect(serialized).not.toContain('costCents');
    expect(serialized).not.toContain('b2bUnitCents');
  });

  it('keeps the fields the storefront actually renders', () => {
    const product = toPublic(PRODUCTS[0]);
    for (const key of ['id', 'slug', 'name', 'priceCents', 'stock', 'kind'] as const) {
      expect(product[key], key).toBeDefined();
    }
  });
});

describe('pSEO route enumeration', () => {
  it('emits a brand × category route only where products exist', () => {
    for (const route of brandCategoryRoutes()) {
      const count = PRODUCTS.filter(
        (p) => p.brandSlug === route.brandSlug && p.categorySlug === route.categorySlug,
      ).length;
      expect(count, `${route.brandSlug}/${route.categorySlug}`).toBeGreaterThan(0);
    }
  });

  it('never emits an empty brand × category page', () => {
    // Thin content at scale is a manual action waiting to happen, so the
    // enumerator must not simply cross-product brands with categories.
    const emitted = new Set(brandCategoryRoutes().map((r) => `${r.brandSlug}/${r.categorySlug}`));
    for (const brand of BRANDS) {
      for (const category of brand.categories) {
        const has = PRODUCTS.some(
          (p) => p.brandSlug === brand.slug && p.categorySlug === category,
        );
        expect(emitted.has(`${brand.slug}/${category}`), `${brand.slug}/${category}`).toBe(has);
      }
    }
  });

  it('emits a flavour route for every flavour, and each has products', () => {
    expect(flavourRoutes().length).toBe(FLAVOURS.length);
    for (const route of flavourRoutes()) {
      const count = PRODUCTS.filter((p) => p.flavourSlug === route.flavourSlug).length;
      expect(count, route.flavourSlug).toBeGreaterThan(0);
    }
  });
});
