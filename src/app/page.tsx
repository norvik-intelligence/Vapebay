import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Boxes,
  CircleDot,
  Droplets,
  FlaskConical,
  Gift,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';

import { BRANDS, CATEGORIES } from '@/lib/data/brands';
import { DEVICES } from '@/lib/data/devices';
import { PRODUCTS, publicProducts } from '@/lib/data/catalog';
import { FLAVOURS } from '@/lib/data/flavours';
import { stockLevel } from '@/lib/utils';
import { faqLd, jsonLdScript } from '@/lib/seo/jsonld';
import { totalPseoRoutes } from '@/lib/seo/pseo';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ProductCard } from '@/components/commerce/product-card';
import { CompatibilityFinder } from '@/components/commerce/compatibility-finder';
import { TasteFinder } from '@/components/commerce/taste-finder';
import { HeroVapour } from '@/components/site/hero-vapour';

export const metadata: Metadata = {
  title: 'Vapebay — Pod-Systeme, NicSalts & Einweg-Vapes mit Kompatibilitätsgarantie',
  description:
    'Finde in 30 Sekunden das Gerät und den Geschmack, der zu dir passt. Garantiert passende Pods, Coils und Liquids. Versand am selben Tag, TPD2-konform.',
  alternates: { canonical: '/' },
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  CircleDot,
  Droplets,
  FlaskConical,
  Wind,
  Boxes,
};

const HOME_FAQ = [
  {
    q: 'Woher weiß ich, welche Pods in mein Gerät passen?',
    a: 'Über den Kompatibilitäts-Finder auf dieser Seite: Gerät auswählen, Widerstand wählen, fertig. Wir zeigen nur Artikel, die mechanisch und elektrisch passen. Pods sind grundsätzlich nur innerhalb derselben Geräteserie kompatibel — ein XROS-Pod passt nicht in eine Caliburn, auch wenn beide magnetisch halten.',
  },
  {
    q: 'Welche Nikotinstärke ist für mich richtig?',
    a: 'Als Faustregel: Wer mehr als 10 Zigaretten täglich raucht, startet mit 20 mg/ml Nikotinsalz in einem Pod ab 1.0 Ohm. Wer weniger raucht oder ein Gerät mit 0.6 Ohm nutzt, nimmt 10 mg/ml — niedrige Widerstände verdampfen mehr Liquid pro Zug, entsprechend weniger Nikotin ist nötig. Der Geschmacks-Finder rechnet das aus deinen Antworten aus.',
  },
  {
    q: 'Wie schnell wird geliefert?',
    a: 'Bestellungen bis 15 Uhr an Werktagen gehen am selben Tag mit DHL oder DPD raus. Innerhalb Deutschlands ist die Ware in der Regel am nächsten Werktag da, nach Österreich in zwei Werktagen. Ab 49 € Bestellwert ist der Versand kostenlos.',
  },
  {
    q: 'Wie läuft die Altersverifikation ab?',
    a: 'Beim ersten Besuch bestätigst du deine Volljährigkeit selbst. Beim Checkout folgt die gesetzlich vorgeschriebene Prüfung per PostIdent oder SOFORT Ident — das dauert unter zwei Minuten und ist einmalig. Danach ist dein Konto verifiziert und alle weiteren Bestellungen laufen ohne erneute Prüfung.',
  },
  {
    q: 'Sind alle Produkte TPD2-konform?',
    a: 'Ja. Alle nikotinhaltigen Liquids sind in 10-ml-Flaschen mit maximal 20 mg/ml abgefüllt, Einweggeräte haben maximal 2 ml Tankvolumen. Sämtliche Artikel sind beim BVL registriert und in Deutschland und Österreich verkehrsfähig.',
  },
  {
    q: 'Beliefert ihr auch Kioske und Fachhandel?',
    a: 'Ja. Ab 50 Stück gelten Netto-Staffelpreise, auf Wunsch mit Blind-Dropshipping: Die Ware geht mit deinem Absender und deinem Lieferschein direkt an deinen Endkunden. Details im B2B-Bereich.',
  },
];

export default function HomePage() {
  const inStock = PRODUCTS.filter((p) => stockLevel(p.stock) !== 'out_of_stock');

  const bestsellers = publicProducts(
    [...inStock]
      .filter((p) => p.kind !== 'bundle')
      .sort((a, b) => b.rating * Math.log(b.reviewCount + 1) - a.rating * Math.log(a.reviewCount + 1))
      .slice(0, 8),
  );

  const pickerDevices = DEVICES.map(({ slug, name, brandSlug, coilOhms, podFamily, drawStyle }) => ({
    slug,
    name,
    brandSlug,
    coilOhms,
    podFamily,
    drawStyle,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd(HOME_FAQ)) }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <HeroVapour />

        <div className="container relative py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl">
            <Badge variant="accent" className="animate-drift-up">
              <Sparkles className="size-3" aria-hidden />
              {totalPseoRoutes()} Kompatibilitäts-Seiten · {PRODUCTS.length} Artikel ab Lager
            </Badge>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Nie wieder den
              <br />
              <span className="text-accent">falschen Pod</span> kaufen.
            </h1>

            <p className="measure mt-6 text-lg leading-relaxed text-fg-muted">
              Vapebay kennt jede Gerätefamilie, jeden Widerstand und jedes PG/VG-Fenster. Sag uns,
              was du dampfst — wir zeigen dir ausschließlich, was passt.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <TasteFinder>
                <Button size="lg" className="w-full sm:w-auto">
                  <Sparkles className="size-4" aria-hidden />
                  Geschmack in 30 Sekunden finden
                </Button>
              </TasteFinder>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <Link href="#kompatibilitaet">
                  Kompatibilität prüfen
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
              {[
                [DEVICES.length, 'Geräte im Index'],
                [FLAVOURS.length, 'Geschmacksprofile'],
                ['15 Uhr', 'Versand-Cutoff'],
                ['0 €', 'Versand ab 49 €'],
              ].map(([value, label]) => (
                <div key={String(label)}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block font-mono text-2xl font-medium tabular">{value}</span>
                    <span className="mt-1 block text-xs text-fg-subtle">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Compatibility engine ──────────────────────────────────────────── */}
      <section id="kompatibilitaet" className="container scroll-mt-24 py-8 sm:py-12">
        <CompatibilityFinder devices={pickerDevices} />
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section className="container py-16 sm:py-20" aria-labelledby="categories-title">
        <h2 id="categories-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Sortiment
        </h2>
        <p className="measure mt-2 text-sm text-fg-muted">
          Sechs Kategorien, klar getrennt nach dem, was du tatsächlich brauchst.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const Icon = ICONS[category.icon] ?? Zap;
            const count = PRODUCTS.filter((p) => p.categorySlug === category.slug).length;
            return (
              <Link
                key={category.slug}
                href={`/produkte/${category.slug}`}
                className="glass glass-hover group flex flex-col rounded-lg p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 place-items-center rounded-md border border-line bg-white/[0.03] transition-colors group-hover:border-accent/40 group-hover:bg-accent-subtle">
                    <Icon className="size-4 text-accent" />
                  </span>
                  <span className="font-mono text-2xs text-fg-subtle">{count} Artikel</span>
                </div>
                <h3 className="mt-5 text-lg font-medium">{category.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {category.description}
                </p>
                <span className="mt-5 flex items-center gap-1.5 text-sm font-medium text-accent">
                  Ansehen
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Bundle builder teaser ─────────────────────────────────────────── */}
      <section className="container py-8">
        <div className="glass relative overflow-hidden rounded-xl p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-24 size-80 animate-vapour-float rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wide text-accent">
                <Gift className="size-3.5" aria-hidden />
                Bundle Builder
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                1 Gerät + 2 Pods + 5 Liquids = 15 % Rabatt
              </h2>
              <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
                Stell dir dein Set selbst zusammen. Der Rabatt wird live berechnet und im Warenkorb
                automatisch abgezogen — kein Gutscheincode, keine Mindestlaufzeit.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href="/bundle">
                Set zusammenstellen
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Bestsellers ───────────────────────────────────────────────────── */}
      <section className="container py-16 sm:py-20" aria-labelledby="bestsellers-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="bestsellers-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Meistgekauft diese Woche
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              Gewichtet nach Bewertung und Anzahl der Rezensionen.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/produkte">
              Alle Artikel
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bestsellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ── Brands ────────────────────────────────────────────────────────── */}
      <section className="container py-16 sm:py-20" aria-labelledby="brands-title">
        <h2 id="brands-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Marken
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              href={`/marken/${brand.slug}`}
              // min-w-0 + overflow-hidden: the tagline is `truncate`
              // (white-space: nowrap), and without clamping the card here that
              // nowrap text sizes the grid track and pushes the page into a
              // horizontal scroll at 375px.
              className="glass glass-hover group flex min-w-0 items-center gap-4 overflow-hidden rounded-md p-4"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-sm border border-line bg-white/[0.03] font-mono text-sm font-medium text-fg-muted transition-colors group-hover:border-accent/40 group-hover:text-accent">
                {brand.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{brand.name}</span>
                <span className="block truncate text-xs text-fg-subtle">{brand.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="container py-16 sm:py-20" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 id="faq-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Häufige Fragen
            </h2>
            <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
              Die sechs Fragen, die vor der ersten Bestellung am häufigsten gestellt werden. Für
              gerätespezifische Antworten nutze den Kompatibilitäts-Finder.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {HOME_FAQ.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
