import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Droplets } from 'lucide-react';

import { FLAVOURS, PROFILE_LABELS, flavourBySlug } from '@/lib/data/flavours';
import { productsByFlavour, publicProducts } from '@/lib/data/catalog';
import { BRANDS } from '@/lib/data/brands';
import { flavourFaq, flavourRoutes } from '@/lib/seo/pseo';
import { breadcrumbLd, faqLd, itemListLd, jsonLdScript } from '@/lib/seo/jsonld';
import { formatEur, stockLevel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, FaqSection, PageHeader } from '@/components/site/page-shell';
import { ProductGrid } from '@/components/commerce/product-card';

interface Params {
  params: Promise<{ flavour: string }>;
}

/**
 * pSEO template 2: /geschmack/[flavour-slug]
 *
 * Brand-agnostic demand ("blaubeere eis liquid") lands here and sees every
 * bottle in that profile across all brands and strengths — the comparison page
 * that a per-brand PDP cannot be.
 */
export function generateStaticParams() {
  return flavourRoutes().map((route) => ({ flavour: route.flavourSlug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { flavour: slug } = await params;
  const flavour = flavourBySlug(slug);
  if (!flavour) return {};

  const products = productsByFlavour(flavour.slug);
  const cheapest = Math.min(...products.map((p) => p.priceCents));

  return {
    title: `${flavour.name} Liquid & NicSalt — ${products.length} Sorten ab ${formatEur(cheapest)}`,
    description: `${flavour.description.slice(0, 120)} Alle Marken und Nikotinstärken im Vergleich. Versand am selben Tag.`,
    alternates: { canonical: `/geschmack/${flavour.slug}` },
  };
}

export default async function FlavourPage({ params }: Params) {
  const { flavour: slug } = await params;
  const flavour = flavourBySlug(slug);
  if (!flavour) notFound();

  const products = productsByFlavour(flavour.slug).sort(
    (a, b) =>
      Number(stockLevel(b.stock) !== 'out_of_stock') - Number(stockLevel(a.stock) !== 'out_of_stock') ||
      (a.nicotineMg ?? 0) - (b.nicotineMg ?? 0),
  );

  const faq = flavourFaq(flavour, products.length);
  const brands = BRANDS.filter((b) => products.some((p) => p.brandSlug === b.slug));

  // Same profile family, different flavour — the internal-link mesh for
  // discovery traffic.
  const related = FLAVOURS.filter(
    (f) => f.slug !== flavour.slug && f.profiles.some((p) => flavour.profiles.includes(p)),
  ).slice(0, 6);

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Geschmack', path: '/geschmack' },
    { name: flavour.name, path: `/geschmack/${flavour.slug}` },
  ];

  return (
    <div className="container pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(crumbs),
            faqLd(faq),
            itemListLd(products, (p) => `/produkt/${p.slug}`, `${flavour.name} Liquids`),
          ]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <>
            <Droplets className="size-3.5" aria-hidden />
            Geschmacksprofil
          </>
        }
        title={flavour.name}
        description={flavour.description}
      >
        <div className="flex flex-wrap gap-2">
          {flavour.profiles.map((profile) => (
            <Badge key={profile} variant="accent">
              {PROFILE_LABELS[profile]}
            </Badge>
          ))}
          <Badge>{products.length} Produkte</Badge>
          <Badge>10 · 20 mg NicSalt · 3 mg Freebase</Badge>
        </div>
      </PageHeader>

      <section className="grid gap-6 sm:grid-cols-3" aria-labelledby="profile-title">
        <h2 id="profile-title" className="sr-only">
          Profilwerte
        </h2>
        <ProfileCard label="Süße" value={flavour.sweetness} />
        <ProfileCard label="Kühle" value={flavour.coolness} />
        <div className="glass rounded-lg p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Aromanoten</p>
          <ol className="mt-3 space-y-1.5 text-sm text-fg-muted">
            {flavour.notes.map((note, index) => (
              <li key={note} className="flex gap-2">
                <span className="font-mono text-2xs text-fg-faint">{index + 1}</span>
                {note}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {brands.length > 0 && (
        <nav aria-label="Marken mit diesem Geschmack" className="mt-10 flex flex-wrap gap-2">
          <span className="self-center text-sm text-fg-muted">Verfügbar von:</span>
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/marken/${brand.slug}/nicsalts`}
              className="rounded-md border border-line bg-white/[0.02] px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              {brand.name}
            </Link>
          ))}
        </nav>
      )}

      <section className="mt-12" aria-labelledby="products-title">
        <h2 id="products-title" className="text-2xl font-semibold tracking-tight">
          Alle {flavour.name} Liquids
        </h2>
        <ProductGrid products={publicProducts(products)} className="mt-6" />
      </section>

      <FaqSection items={faq} />

      {related.length > 0 && (
        <section className="border-t border-line pt-12" aria-labelledby="related-title">
          <h2 id="related-title" className="text-lg font-semibold tracking-tight">
            Ähnliche Geschmacksprofile
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {related.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/geschmack/${f.slug}`}
                  className="inline-flex rounded-md border border-line bg-white/[0.02] px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProfileCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-lg p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        <p className="font-mono text-lg tabular">{value}/10</p>
      </div>
      <div
        className="mt-4 flex gap-1"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={label}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < value ? 'bg-accent' : 'bg-white/[0.08]'}`}
          />
        ))}
      </div>
    </div>
  );
}
