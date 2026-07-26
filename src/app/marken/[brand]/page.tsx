import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { BRANDS, brandBySlug, categoryBySlug } from '@/lib/data/brands';
import { productsByBrand, publicProducts } from '@/lib/data/catalog';
import { DEVICES, coilSegment } from '@/lib/data/devices';
import { breadcrumbLd, itemListLd, jsonLdScript } from '@/lib/seo/jsonld';
import { formatEur } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';
import { ProductCard } from '@/components/commerce/product-card';

interface Params {
  params: Promise<{ brand: string }>;
}

export function generateStaticParams() {
  return BRANDS.map((brand) => ({ brand: brand.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand) return {};
  const count = productsByBrand(brand.slug).length;

  return {
    title: `${brand.name} — ${count} Artikel ab Lager`,
    description: `${brand.tagline}. ${brand.description.slice(0, 110)}`,
    alternates: { canonical: `/marken/${brand.slug}` },
  };
}

export default async function BrandPage({ params }: Params) {
  const { brand: slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand) notFound();

  const products = productsByBrand(brand.slug);
  const cheapest = products.length ? Math.min(...products.map((p) => p.priceCents)) : 0;
  const devices = DEVICES.filter((d) => d.brandSlug === brand.slug);

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Marken', path: '/marken' },
    { name: brand.name, path: `/marken/${brand.slug}` },
  ];

  return (
    <div className="container pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(crumbs),
            itemListLd(products, (p) => `/produkt/${p.slug}`, `${brand.name} Sortiment`),
            {
              '@context': 'https://schema.org',
              '@type': 'Brand',
              name: brand.name,
              description: brand.description,
              foundingDate: String(brand.founded),
            },
          ]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <span className="grid size-6 place-items-center rounded-sm border border-accent/30 bg-accent-subtle font-mono">
            {brand.mark}
          </span>
        }
        title={brand.name}
        description={brand.description}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">{products.length} Artikel</Badge>
          <Badge>Seit {brand.founded}</Badge>
          <Badge>Ab {formatEur(cheapest)}</Badge>
        </div>
      </PageHeader>

      <nav aria-label="Kategorien dieser Marke" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brand.categories.map((categorySlug) => {
          const category = categoryBySlug(categorySlug);
          const count = products.filter((p) => p.categorySlug === categorySlug).length;
          if (!category || count === 0) return null;

          return (
            <Link
              key={categorySlug}
              href={`/marken/${brand.slug}/${categorySlug}`}
              className="glass glass-hover group flex flex-col rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-medium group-hover:text-accent">{category.name}</h2>
                <span className="shrink-0 font-mono text-2xs text-fg-subtle">{count}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">{category.short}</p>
              <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-accent">
                Ansehen
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </nav>

      {devices.length > 0 && (
        <section className="mt-14" aria-labelledby="devices-title">
          <h2 id="devices-title" className="text-lg font-semibold tracking-tight">
            Kompatibilität der {brand.name} Geräte
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {devices.map((device) => (
              <li key={device.slug}>
                <Link
                  href={
                    device.podFamily === 'disposable'
                      ? `/produkt/${device.slug}`
                      : `/kompatibel/${device.slug}/${coilSegment(device.coilOhms[0])}`
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.02] px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {device.name}
                  <span className="font-mono text-2xs text-fg-subtle">{device.drawStyle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14" aria-labelledby="all-title">
        <h2 id="all-title" className="text-2xl font-semibold tracking-tight">
          Alle {brand.name} Artikel
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {publicProducts(products.slice(0, 12)).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
