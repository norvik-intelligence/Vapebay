import type { Metadata } from 'next';
import Link from 'next/link';

import { BRANDS, categoryBySlug } from '@/lib/data/brands';
import { productsByBrand } from '@/lib/data/catalog';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo/jsonld';
import { formatEur } from '@/lib/utils';
import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Alle Marken',
  description:
    'RandM, Elfbar, Lost Mary, HQD, Al Fakher, Vaporesso, Uwell und Flerbar — alle Marken im Vapebay-Sortiment mit Positionierung, Sortimentsumfang und Preisniveau.',
  alternates: { canonical: '/marken' },
};

export default function BrandIndexPage() {
  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Marken', path: '/marken' },
  ];

  return (
    <div className="container pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd(crumbs)) }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        title="Marken"
        description="Acht Hersteller, von Hardware-Spezialisten wie Vaporesso und Uwell bis zu Aroma-Häusern wie Al Fakher. Jede Marke mit eigener Sortimentsseite je Kategorie."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {BRANDS.map((brand) => {
          const products = productsByBrand(brand.slug);
          const cheapest = products.length ? Math.min(...products.map((p) => p.priceCents)) : 0;

          return (
            <article key={brand.slug} className="glass rounded-lg p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03] font-mono text-base font-medium text-fg-muted">
                  {brand.mark}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-medium">
                    <Link href={`/marken/${brand.slug}`} className="hover:text-accent">
                      {brand.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-sm text-fg-subtle">{brand.tagline}</p>
                </div>
                <dl className="shrink-0 text-right font-mono text-2xs text-fg-subtle">
                  <dt className="sr-only">Artikelanzahl</dt>
                  <dd>{products.length} Artikel</dd>
                  <dt className="sr-only">Günstigster Preis</dt>
                  <dd className="mt-1 text-fg-muted">ab {formatEur(cheapest)}</dd>
                </dl>
              </div>

              <p className="measure mt-4 text-sm leading-relaxed text-fg-muted">
                {brand.description}
              </p>

              <ul className="mt-5 flex flex-wrap gap-2">
                {brand.categories.map((slug) => {
                  const category = categoryBySlug(slug);
                  const count = products.filter((p) => p.categorySlug === slug).length;
                  if (!category || count === 0) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/marken/${brand.slug}/${slug}`}
                        className="inline-flex items-center gap-2 rounded-sm border border-line bg-white/[0.03] px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        {category.name}
                        <span className="font-mono text-2xs text-fg-subtle">{count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
