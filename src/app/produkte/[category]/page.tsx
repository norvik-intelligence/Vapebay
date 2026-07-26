import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { CATEGORIES, categoryBySlug, BRANDS } from '@/lib/data/brands';
import { productsByCategory, publicProducts } from '@/lib/data/catalog';
import type { CategorySlug } from '@/lib/types';
import { stockLevel } from '@/lib/utils';
import { breadcrumbLd, itemListLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';
import { ProductGrid } from '@/components/commerce/product-card';

interface Params {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return {};

  const count = productsByCategory(category.slug).length;
  return {
    title: `${category.name} — ${count} Artikel ab Lager`,
    description: `${category.description} ${count} Artikel sofort verfügbar, Versand am selben Werktag.`,
    alternates: { canonical: `/produkte/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const products = productsByCategory(category.slug as CategorySlug).sort(
    (a, b) =>
      Number(stockLevel(b.stock) !== 'out_of_stock') - Number(stockLevel(a.stock) !== 'out_of_stock') ||
      b.rating - a.rating,
  );

  // Only brands that actually stock this category — an empty brand chip is a
  // dead end for the shopper and a crawl-budget leak for the bot.
  const brands = BRANDS.filter((brand) => products.some((p) => p.brandSlug === brand.slug));

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Produkte', path: '/produkte' },
    { name: category.name, path: `/produkte/${category.slug}` },
  ];

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(crumbs),
            itemListLd(products, (p) => `/produkt/${p.slug}`, category.name),
          ]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={category.short}
        title={category.name}
        description={category.description}
      >
        {brands.length > 0 && (
          <nav aria-label="Marken in dieser Kategorie" className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/marken/${brand.slug}/${category.slug}`}
                className="rounded-md border border-line bg-white/[0.02] px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
              >
                {brand.name}
              </Link>
            ))}
          </nav>
        )}
      </PageHeader>

      <ProductGrid products={publicProducts(products)} className="pb-16" />
    </div>
  );
}
