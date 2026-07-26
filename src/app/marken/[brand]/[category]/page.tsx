import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { brandBySlug, categoryBySlug } from '@/lib/data/brands';
import { PRODUCTS, publicProducts } from '@/lib/data/catalog';
import { brandCategoryFaq, brandCategoryRoutes } from '@/lib/seo/pseo';
import { breadcrumbLd, faqLd, itemListLd, jsonLdScript } from '@/lib/seo/jsonld';
import { formatEur, stockLevel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, FaqSection, PageHeader } from '@/components/site/page-shell';
import { ProductGrid } from '@/components/commerce/product-card';

interface Params {
  params: Promise<{ brand: string; category: string }>;
}

/**
 * pSEO template 3: /marken/[brand-slug]/[category-slug]
 *
 * Only combinations that actually hold products are enumerated — see
 * `brandCategoryRoutes()`. Emitting the full cross-product would generate
 * dozens of empty pages and invite a thin-content penalty.
 */
export function generateStaticParams() {
  return brandCategoryRoutes().map((route) => ({
    brand: route.brandSlug,
    category: route.categorySlug,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { brand: brandSlug, category: categorySlug } = await params;
  const brand = brandBySlug(brandSlug);
  const category = categoryBySlug(categorySlug);
  if (!brand || !category) return {};

  const products = PRODUCTS.filter(
    (p) => p.brandSlug === brandSlug && p.categorySlug === categorySlug,
  );
  if (products.length === 0) return {};
  const cheapest = Math.min(...products.map((p) => p.priceCents));

  return {
    title: `${brand.name} ${category.name} — ${products.length} Artikel ab ${formatEur(cheapest)}`,
    description: `${brand.tagline}. ${products.length} ${category.name} sofort ab Lager, Versand am selben Werktag. ${category.short}.`,
    alternates: { canonical: `/marken/${brand.slug}/${category.slug}` },
  };
}

export default async function BrandCategoryPage({ params }: Params) {
  const { brand: brandSlug, category: categorySlug } = await params;
  const brand = brandBySlug(brandSlug);
  const category = categoryBySlug(categorySlug);
  if (!brand || !category) notFound();

  const products = PRODUCTS.filter(
    (p) => p.brandSlug === brandSlug && p.categorySlug === categorySlug,
  ).sort(
    (a, b) =>
      Number(stockLevel(b.stock) !== 'out_of_stock') - Number(stockLevel(a.stock) !== 'out_of_stock') ||
      b.rating - a.rating,
  );
  if (products.length === 0) notFound();

  const faq = brandCategoryFaq(brand.slug, category.slug, products.length);
  const cheapest = Math.min(...products.map((p) => p.priceCents));
  const inStock = products.filter((p) => stockLevel(p.stock) !== 'out_of_stock').length;

  const otherCategories = brand.categories.filter(
    (slug) =>
      slug !== category.slug && PRODUCTS.some((p) => p.brandSlug === brand.slug && p.categorySlug === slug),
  );

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Marken', path: '/marken' },
    { name: brand.name, path: `/marken/${brand.slug}` },
    { name: category.name, path: `/marken/${brand.slug}/${category.slug}` },
  ];

  return (
    <div className="container pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(crumbs),
            faqLd(faq),
            itemListLd(
              products,
              (p) => `/produkt/${p.slug}`,
              `${brand.name} ${category.name}`,
            ),
          ]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <>
            <span className="grid size-6 place-items-center rounded-sm border border-accent/30 bg-accent-subtle font-mono">
              {brand.mark}
            </span>
            {brand.tagline}
          </>
        }
        title={`${brand.name} ${category.name}`}
        description={`${category.description} ${brand.description.split('.')[0]}.`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">{inStock} sofort lieferbar</Badge>
          <Badge>Ab {formatEur(cheapest)}</Badge>
          <Badge>TPD2-konform</Badge>
        </div>
      </PageHeader>

      <ProductGrid products={publicProducts(products)} />

      {otherCategories.length > 0 && (
        <nav aria-label="Weitere Kategorien dieser Marke" className="mt-12 flex flex-wrap gap-2">
          <span className="self-center text-sm text-fg-muted">Mehr von {brand.name}:</span>
          {otherCategories.map((slug) => {
            const other = categoryBySlug(slug);
            return (
              <Link
                key={slug}
                href={`/marken/${brand.slug}/${slug}`}
                className="rounded-md border border-line bg-white/[0.02] px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
              >
                {other?.name}
              </Link>
            );
          })}
        </nav>
      )}

      <FaqSection items={faq} />
    </div>
  );
}
