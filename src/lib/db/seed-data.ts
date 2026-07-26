import type { Db } from './index';
import {
  ageVerifications,
  brands,
  devices,
  flavours,
  markupRules,
  products,
  pseoTemplates,
  suppliers,
} from './schema';
import { BRANDS } from '@/lib/data/brands';
import { DEVICES } from '@/lib/data/devices';
import { FLAVOURS } from '@/lib/data/flavours';
import { PRODUCTS } from '@/lib/data/catalog';
import { SUPPLIERS } from '@/lib/admin/suppliers';
import { MARKUP_RULE_SET } from '@/lib/admin/pricing';
import { PSEO_TEMPLATES } from '@/lib/seo/pseo';

export interface SeedSummary {
  brands: number;
  devices: number;
  flavours: number;
  products: number;
  suppliers: number;
}

/**
 * Befüllt eine Datenbank aus dem In-Repo-Katalog.
 *
 * Idempotent (Upserts auf den Primärschlüssel) und ohne eigenen
 * Verbindungsaufbau — die Verbindung kommt vom Aufrufer. Dadurch kann dieselbe
 * Funktion vom CLI-Seed, vom E2E-Setup und vom Runtime-Bootstrap (Vercel,
 * frischer Docker-Volume) genutzt werden, ohne dass drei Seed-Implementierungen
 * auseinanderdriften.
 */
export function seedDatabase(db: Db): SeedSummary {
  for (const brand of BRANDS) {
    db.insert(brands)
      .values({
        slug: brand.slug,
        name: brand.name,
        tagline: brand.tagline,
        country: brand.country,
        founded: brand.founded,
        mark: brand.mark,
        description: brand.description,
      })
      .onConflictDoUpdate({
        target: brands.slug,
        set: { name: brand.name, tagline: brand.tagline, description: brand.description },
      })
      .run();
  }

  for (const device of DEVICES) {
    db.insert(devices)
      .values({
        slug: device.slug,
        name: device.name,
        brandSlug: device.brandSlug,
        podFamily: device.podFamily,
        drawStyle: device.drawStyle,
        coilOhms: device.coilOhms,
        wattMin: device.wattageRange[0],
        wattMax: device.wattageRange[1],
        batteryMah: device.batteryMah,
        podCapacityMl: device.podCapacityMl,
        refillable: device.refillable,
        releaseYear: device.releaseYear,
        idealVg: device.idealVg,
        vgMin: device.vgRange[0],
        vgMax: device.vgRange[1],
        maxNicotineMg: device.maxNicotineMg,
        popularity: device.popularity,
        summary: device.summary,
      })
      .onConflictDoUpdate({
        target: devices.slug,
        set: { coilOhms: device.coilOhms, popularity: device.popularity, summary: device.summary },
      })
      .run();
  }

  for (const flavour of FLAVOURS) {
    db.insert(flavours)
      .values({
        slug: flavour.slug,
        name: flavour.name,
        profiles: flavour.profiles,
        notes: flavour.notes,
        sweetness: flavour.sweetness,
        coolness: flavour.coolness,
        description: flavour.description,
      })
      .onConflictDoUpdate({
        target: flavours.slug,
        set: { description: flavour.description, notes: flavour.notes },
      })
      .run();
  }

  // Eine Transaktion für den ganzen Katalog: 178 einzelne Commits würden je
  // ein WAL-fsync kosten — aus einem Sub-Sekunden-Seed würden ~20 Sekunden.
  db.transaction((tx) => {
    for (const product of PRODUCTS) {
      tx.insert(products)
        .values({
          id: product.id,
          slug: product.slug,
          name: product.name,
          kind: product.kind,
          brandSlug: product.brandSlug,
          categorySlug: product.categorySlug,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          costCents: product.costCents,
          stock: product.stock,
          rating: product.rating,
          reviewCount: product.reviewCount,
          flavourSlug: product.flavourSlug,
          nicotineMg: product.nicotineMg,
          vg: product.vg,
          volumeMl: product.volumeMl,
          coilOhm: product.coilOhm,
          podFamilies: product.podFamilies,
          deviceSlug: product.deviceSlug,
          puffs: product.puffs,
          packSize: product.packSize,
          b2bMinQty: product.b2bMinQty,
          b2bUnitCents: product.b2bUnitCents,
          tags: product.tags,
          summary: product.summary,
          hue: product.hue,
        })
        .onConflictDoUpdate({
          target: products.id,
          set: {
            priceCents: product.priceCents,
            costCents: product.costCents,
            stock: product.stock,
            compareAtCents: product.compareAtCents,
          },
        })
        .run();
    }
  });

  for (const supplier of SUPPLIERS) {
    db.insert(suppliers)
      .values({
        id: supplier.id,
        name: supplier.name,
        transport: supplier.transport,
        endpoint: supplier.endpoint,
        schedule: supplier.schedule,
        lastSyncAt: supplier.lastSyncAt,
        lastSyncStatus: supplier.lastSyncStatus,
        itemsTracked: supplier.itemsTracked,
        supportsBlindDropship: supplier.supportsBlindDropship,
        leadTimeDays: supplier.leadTimeDays,
      })
      .onConflictDoUpdate({
        target: suppliers.id,
        set: { lastSyncAt: supplier.lastSyncAt, lastSyncStatus: supplier.lastSyncStatus },
      })
      .run();
  }

  db.delete(markupRules).run();
  for (const rule of MARKUP_RULE_SET) {
    db.insert(markupRules)
      .values({
        productKind: rule.kind,
        markupBps: rule.markupBps,
        floorCents: rule.floorCents,
        charmPricing: rule.charmPricing,
        active: rule.active,
      })
      .run();
  }

  for (const template of PSEO_TEMPLATES) {
    db.insert(pseoTemplates)
      .values({
        id: template.id,
        name: template.name,
        pattern: template.pattern,
        intent: template.intent,
        enrichmentPrompt: template.enrichmentPrompt,
        enabled: template.enabled,
        routeCount: template.routeCount(),
        lastGeneratedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: pseoTemplates.id,
        set: { routeCount: template.routeCount(), lastGeneratedAt: new Date().toISOString() },
      })
      .run();
  }

  const sample = [
    { reference: 'SI-DEMO0001', provider: 'sofort' as const, status: 'verified' as const, lastName: 'Weber', birthDate: '1994-03-12' },
    { reference: 'PI-DEMO0002', provider: 'postident' as const, status: 'verified' as const, lastName: 'Demir', birthDate: '1988-11-02' },
    { reference: 'SI-DEMO0003', provider: 'sofort' as const, status: 'rejected' as const, lastName: 'Müller', birthDate: '2011-06-30' },
  ];
  for (const [index, entry] of sample.entries()) {
    db.insert(ageVerifications)
      .values({ ...entry, checkedAt: new Date(Date.now() - index * 3_600_000).toISOString() })
      .onConflictDoNothing()
      .run();
  }

  return {
    brands: BRANDS.length,
    devices: DEVICES.length,
    flavours: FLAVOURS.length,
    products: PRODUCTS.length,
    suppliers: SUPPLIERS.length,
  };
}
