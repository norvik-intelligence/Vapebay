import type { MetadataRoute } from 'next';

import { PRODUCTS } from '@/lib/data/catalog';
import { BRANDS, CATEGORIES } from '@/lib/data/brands';
import { FLAVOURS } from '@/lib/data/flavours';
import {
  PSEO_TEMPLATES,
  brandCategoryRoutes,
  compatibilityRoutes,
} from '@/lib/seo/pseo';
import { abs } from '@/lib/seo/jsonld';

/**
 * The sitemap is generated from the same enumerators as the routes themselves,
 * so a template that stops emitting pages also stops appearing here. A sitemap
 * listing URLs that 404 is worse than no sitemap.
 *
 * Priorities reflect commercial intent, not page depth: a compatibility page
 * converts better than the homepage, so it does not get demoted for being three
 * segments deep.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const templateEnabled = (id: string) =>
    PSEO_TEMPLATES.find((template) => template.id === id)?.enabled ?? false;

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      ['/', 'daily', 1],
      ['/produkte', 'daily', 0.9],
      ['/kompatibel', 'weekly', 0.9],
      ['/geschmack', 'weekly', 0.8],
      ['/marken', 'weekly', 0.8],
      ['/bundle', 'weekly', 0.7],
      ['/b2b', 'monthly', 0.7],
    ] as const
  ).map(([path, changeFrequency, priority]) => ({
    url: abs(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: abs(`/produkte/${category.slug}`),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const brandRoutes: MetadataRoute.Sitemap = BRANDS.map((brand) => ({
    url: abs(`/marken/${brand.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((product) => ({
    url: abs(`/produkt/${product.slug}`),
    lastModified: now,
    changeFrequency: 'daily',
    // In-stock items outrank sold-out ones — crawl budget follows revenue.
    priority: product.stock > 0 ? 0.8 : 0.4,
  }));

  const compatRoutes: MetadataRoute.Sitemap = templateEnabled('kompatibel')
    ? compatibilityRoutes().map((route) => ({
        url: abs(`/kompatibel/${route.deviceSlug}/${route.coilOhm}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      }))
    : [];

  const flavourPages: MetadataRoute.Sitemap = templateEnabled('geschmack')
    ? FLAVOURS.map((flavour) => ({
        url: abs(`/geschmack/${flavour.slug}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    : [];

  const brandCategoryPages: MetadataRoute.Sitemap = templateEnabled('marken')
    ? brandCategoryRoutes().map((route) => ({
        url: abs(`/marken/${route.brandSlug}/${route.categorySlug}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    : [];

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...brandRoutes,
    ...compatRoutes,
    ...flavourPages,
    ...brandCategoryPages,
    ...productRoutes,
  ];
}
