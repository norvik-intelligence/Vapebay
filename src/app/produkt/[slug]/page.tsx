import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, Truck, ShieldCheck, RotateCcw } from 'lucide-react';

import { PRODUCTS, productBySlug, productsByFlavour, publicProducts } from '@/lib/data/catalog';
import { brandBySlug, categoryBySlug } from '@/lib/data/brands';
import { DEVICES, deviceBySlug, coilSegment } from '@/lib/data/devices';
import { flavourBySlug } from '@/lib/data/flavours';
import { recommendedNicotineMg } from '@/lib/compat';
import { formatEur, stockLevel } from '@/lib/utils';
import { breadcrumbLd, jsonLdScript, productLd } from '@/lib/seo/jsonld';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumbs, SpecTable } from '@/components/site/page-shell';
import { ProductVisual } from '@/components/commerce/product-visual';
import { ProductCard } from '@/components/commerce/product-card';
import { StockBadge } from '@/components/commerce/stock-badge';
import { AddToCart } from '@/components/commerce/add-to-cart';

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) return {};
  const brand = brandBySlug(product.brandSlug);

  return {
    title: `${product.name} — ${formatEur(product.priceCents)}`,
    description: product.summary.slice(0, 160),
    alternates: { canonical: `/produkt/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      type: 'website',
      siteName: 'Vapebay',
    },
    other: brand ? { 'product:brand': brand.name } : undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  const brand = brandBySlug(product.brandSlug)!;
  const category = categoryBySlug(product.categorySlug)!;
  const flavour = product.flavourSlug ? flavourBySlug(product.flavourSlug) : null;
  const device = product.deviceSlug ? deviceBySlug(product.deviceSlug) : null;
  const level = stockLevel(product.stock);
  const path = `/produkt/${product.slug}`;

  // Devices this product fits — the single most-asked question on a pod page.
  const fittingDevices = product.podFamilies.length
    ? DEVICES.filter((d) => product.podFamilies.includes(d.podFamily))
    : [];

  const related = publicProducts(
    (flavour
      ? productsByFlavour(flavour.slug).filter((p) => p.id !== product.id)
      : PRODUCTS.filter(
          (p) => p.categorySlug === product.categorySlug && p.id !== product.id,
        )
    ).slice(0, 4),
  );

  const specs: [string, React.ReactNode][] = [
    ['Marke', brand.name],
    ['Kategorie', category.name],
    ...(product.volumeMl ? ([['Inhalt', `${product.volumeMl} ml`]] as [string, string][]) : []),
    ...(product.nicotineMg !== null
      ? ([['Nikotin', `${product.nicotineMg} mg/ml`]] as [string, string][])
      : []),
    ...(product.vg !== null
      ? ([['PG/VG', `${100 - product.vg}/${product.vg}`]] as [string, string][])
      : []),
    ...(product.coilOhm !== null
      ? ([['Widerstand', `${product.coilOhm.toFixed(1)} Ohm`]] as [string, string][])
      : []),
    ...(product.puffs ? ([['Züge', product.puffs.toLocaleString('de-DE')]] as [string, string][]) : []),
    ...(device
      ? ([
          ['Akku', `${device.batteryMah} mAh`],
          ['Zugtyp', device.drawStyle],
          ['Tankvolumen', `${Math.min(device.podCapacityMl, 2)} ml`],
        ] as [string, string][])
      : []),
    ['Verpackungseinheit', `${product.packSize} Stück`],
    ['Artikelnummer', product.id],
  ];

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Produkte', path: '/produkte' },
    { name: category.name, path: `/produkte/${category.slug}` },
    { name: product.name, path },
  ];

  return (
    <div className="container pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([breadcrumbLd(crumbs), productLd(product, path, brand.name)]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductVisual
            hue={product.hue}
            kind={product.kind}
            className="aspect-square w-full rounded-xl border border-line"
          />
        </div>

        <div>
          <Link
            href={`/marken/${brand.slug}`}
            className="font-mono text-2xs uppercase tracking-wide text-accent hover:underline"
          >
            {brand.name}
          </Link>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 fill-current text-warning" aria-hidden />
              <span className="font-mono tabular">{product.rating.toFixed(1)}</span>
              <span className="text-fg-subtle">({product.reviewCount} Bewertungen)</span>
            </span>
            <StockBadge stock={product.stock} />
          </div>

          <p className="measure mt-6 text-base leading-relaxed text-fg-muted">{product.summary}</p>

          {product.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <li key={tag}>
                  <Badge>{tag}</Badge>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-medium tabular">
              {formatEur(product.priceCents)}
            </span>
            {product.compareAtCents && (
              <>
                <span className="font-mono text-base text-fg-faint line-through tabular">
                  {formatEur(product.compareAtCents)}
                </span>
                <Badge variant="accent">
                  −{Math.round((1 - product.priceCents / product.compareAtCents) * 100)} %
                </Badge>
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-fg-subtle">
            inkl. 19 % USt.
            {product.volumeMl && (
              <>
                {' · '}
                <span className="font-mono tabular">
                  {formatEur(Math.round((product.priceCents / product.volumeMl) * 1000))} / Liter
                </span>
              </>
            )}
          </p>

          <AddToCart
            productId={product.id}
            productName={product.name}
            maxQty={product.stock}
            disabled={level === 'out_of_stock'}
            className="mt-6"
          />

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              [Truck, 'Versand heute', 'Bestellung bis 15 Uhr'],
              [ShieldCheck, 'Altersprüfung', 'PostIdent / SOFORT'],
              [RotateCcw, '14 Tage Rückgabe', 'Ungeöffnete Ware'],
            ].map(([Icon, title, body]) => {
              const Component = Icon as React.ComponentType<{ className?: string }>;
              return (
                <li key={title as string} className="flex gap-2.5">
                  <Component className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    <span className="block text-xs font-medium">{title as string}</span>
                    <span className="block text-2xs text-fg-subtle">{body as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-12 text-lg font-semibold tracking-tight">Technische Daten</h2>
          <SpecTable rows={specs} className="mt-4" />

          {fittingDevices.length > 0 && (
            <section className="mt-10" aria-labelledby="fits-title">
              <h2 id="fits-title" className="text-lg font-semibold tracking-tight">
                Passt in diese Geräte
              </h2>
              <p className="measure mt-2 text-sm text-fg-muted">
                Ausschließlich Geräte der {product.podFamilies[0]?.toUpperCase()}-Serie. Andere
                Serien haben einen abweichenden Anschluss.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {fittingDevices.map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/kompatibel/${d.slug}/${coilSegment(product.coilOhm ?? d.coilOhms[0])}`}
                      className="inline-flex rounded-md border border-line bg-white/[0.02] px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      {d.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.coilOhm !== null && (
            <section className="mt-10 rounded-md border border-accent/25 bg-accent-subtle p-5">
              <h2 className="text-sm font-medium text-accent">Passende Nikotinstärke</h2>
              <p className="measure mt-2 text-sm leading-relaxed text-fg-muted">
                Für {product.coilOhm.toFixed(1)} Ohm empfehlen wir{' '}
                <strong className="font-mono text-fg">
                  {recommendedNicotineMg(product.coilOhm)} mg/ml
                </strong>
                . Niedrigere Widerstände verdampfen mehr Liquid pro Zug — dieselbe Nikotinmenge
                erreichst du dort mit einer geringeren Konzentration.
              </p>
            </section>
          )}

          {flavour && (
            <section className="mt-10" aria-labelledby="flavour-title">
              <h2 id="flavour-title" className="text-lg font-semibold tracking-tight">
                Geschmacksprofil
              </h2>
              <p className="measure mt-2 text-sm leading-relaxed text-fg-muted">
                {flavour.description}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Meter label="Süße" value={flavour.sweetness} />
                <Meter label="Kühle" value={flavour.coolness} />
              </div>
              <Button asChild variant="link" className="mt-4">
                <Link href={`/geschmack/${flavour.slug}`}>
                  Alle Produkte mit {flavour.name} ansehen
                </Link>
              </Button>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="text-2xl font-semibold tracking-tight">
            {flavour ? `Mehr mit ${flavour.name}` : `Weitere ${category.name}`}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono tabular text-fg-subtle">{value}/10</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}
