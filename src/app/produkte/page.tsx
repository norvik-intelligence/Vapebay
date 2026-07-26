import type { Metadata } from 'next';
import Link from 'next/link';

import { CATEGORIES } from '@/lib/data/brands';
import { PRODUCTS, publicProducts } from '@/lib/data/catalog';
import { stockLevel } from '@/lib/utils';
import { breadcrumbLd, itemListLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';
import { ProductGrid } from '@/components/commerce/product-card';

export const metadata: Metadata = {
  title: 'Alle Produkte',
  description:
    'Das komplette Vapebay-Sortiment: Pod-Systeme, Ersatz-Pods, NicSalts, Liquids, Einweg-Vapes und B2B-Grossmengen. Alle Artikel sofort ab Lager.',
  alternates: { canonical: '/produkte' },
};

export default function ProductsPage() {
  const available = PRODUCTS.filter((p) => stockLevel(p.stock) !== 'out_of_stock').sort(
    (a, b) => b.rating - a.rating,
  );

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Produkte', path: '/produkte' },
  ];

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(crumbs),
            itemListLd(available, (p) => `/produkt/${p.slug}`, 'Alle Produkte'),
          ]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        title="Alle Produkte"
        description={`${available.length} Artikel sofort verfügbar. Bestellungen bis 15 Uhr gehen am selben Werktag raus.`}
      >
        <nav aria-label="Kategorien" className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/produkte/${category.slug}`}
              className="rounded-md border border-line bg-white/[0.02] px-4 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </PageHeader>

      <ProductGrid products={publicProducts(available)} className="pb-16" />
    </div>
  );
}
