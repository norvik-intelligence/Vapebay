import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Boxes, FileText, Percent, Truck } from 'lucide-react';

import { productsByCategory, publicProducts } from '@/lib/data/catalog';
import { SUPPLIERS } from '@/lib/admin/suppliers';
import { formatEur } from '@/lib/utils';
import { breadcrumbLd, faqLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumbs, FaqSection, PageHeader } from '@/components/site/page-shell';
import { ProductGrid } from '@/components/commerce/product-card';

export const metadata: Metadata = {
  title: 'B2B & Grosshandel — Netto-Staffelpreise ab 50 Stück',
  description:
    'Staffelpreise für Kiosk, Fachhandel und Gastronomie. Netto-Konditionen, Blind-Dropshipping an deine Endkunden, Lieferung in 48 Stunden.',
  alternates: { canonical: '/b2b' },
};

const TIERS = [
  { qty: 50, discount: 12, label: 'Einstieg', note: 'Ein Display, gemischte Sorten' },
  { qty: 100, discount: 18, label: 'Standard', note: 'Kartonware, freie Sortenverteilung' },
  { qty: 250, discount: 24, label: 'Volumen', note: 'Palettenanteil, feste Liefertermine' },
  { qty: 500, discount: 30, label: 'Distribution', note: 'Individuelle Konditionen' },
];

const FAQ = [
  {
    q: 'Wie funktioniert Blind-Dropshipping?',
    a: 'Du verkaufst, wir versenden — unter deinem Namen. Die Ware verlässt unser Lager oder das unseres Lieferanten mit deinem Absender und deinem Lieferschein. Der Endkunde erfährt nie, dass wir beteiligt waren. Preise stehen auf keinem beigelegten Dokument.',
  },
  {
    q: 'Ab welcher Menge gelten Nettopreise?',
    a: 'Ab 50 Stück je Artikel oder ab 500 € Bestellwert. Voraussetzung ist eine gültige USt-IdNr. und ein Gewerbenachweis. Die Prüfung läuft einmalig beim ersten Auftrag und dauert in der Regel einen Werktag.',
  },
  {
    q: 'Wie schnell wird B2B geliefert?',
    a: 'Lagerware innerhalb von 48 Stunden. Artikel, die über einen Lieferanten laufen, je nach Quelle 1 bis 14 Tage — die tatsächliche Vorlaufzeit steht bei jeder Position im Angebot, bevor du bestellst.',
  },
  {
    q: 'Gibt es Rückgaberecht auf Grossmengen?',
    a: 'Im B2B-Geschäft besteht kein gesetzliches Widerrufsrecht. Wir nehmen ungeöffnete Displays innerhalb von 30 Tagen dennoch zurück, sofern die Ware verkehrsfähig und die Charge noch aktuell ist. Bei individuell beschafften Artikeln ist die Rücknahme ausgeschlossen.',
  },
  {
    q: 'Sind die Produkte für den Weiterverkauf in Deutschland zugelassen?',
    a: 'Ja. Alle Artikel sind beim BVL nach §21 TabakerzG registriert und TPD2-konform. Auf Anfrage stellen wir die Registrierungsnummern und Konformitätserklärungen für deine Unterlagen bereit.',
  },
];

export default function B2BPage() {
  const bundles = publicProducts(productsByCategory('b2b-bundles'));
  const blindCapable = SUPPLIERS.filter((s) => s.supportsBlindDropship).length;

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'B2B', path: '/b2b' },
  ];

  return (
    <div className="container pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumbLd(crumbs), faqLd(FAQ)]) }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <>
            <Boxes className="size-3.5" aria-hidden />
            Grosshandel
          </>
        }
        title="Netto-Konditionen für Kiosk, Fachhandel und Gastronomie"
        description="Staffelpreise ab 50 Stück, Lieferung in 48 Stunden und auf Wunsch Blind-Dropshipping direkt an deine Endkunden. Ohne Mindestabnahmeverpflichtung und ohne Vertragsbindung."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/checkout">
              Gewerbekonto eröffnen
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="#staffelpreise">Staffelpreise ansehen</Link>
          </Button>
        </div>
      </PageHeader>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Percent, 'Bis 30 % Rabatt', 'Staffelpreise ab 50 Stück je Artikel'],
          [Truck, 'Lieferung in 48 h', 'Lagerware, DHL Express auf Wunsch'],
          [FileText, 'Blind-Dropshipping', `${blindCapable} Lieferanten mit neutralem Versand`],
          [Boxes, 'Freie Sortenwahl', 'Ab 10 Stück je Geschmacksrichtung'],
        ].map(([Icon, title, body]) => {
          const Component = Icon as React.ComponentType<{ className?: string }>;
          return (
            <li key={title as string} className="glass rounded-lg p-5">
              <Component className="size-5 text-accent" aria-hidden />
              <p className="mt-4 text-sm font-medium">{title as string}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{body as string}</p>
            </li>
          );
        })}
      </ul>

      <section id="staffelpreise" className="mt-16 scroll-mt-24" aria-labelledby="tiers-title">
        <h2 id="tiers-title" className="text-2xl font-semibold tracking-tight">
          Staffelpreise
        </h2>
        <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
          Rabatt auf den Netto-Listenpreis, gerechnet je Artikel. Die Staffeln sind kumulierbar
          über eine Bestellung hinweg, wenn dieselbe Warengruppe bezogen wird.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier, index) => (
            <div
              key={tier.qty}
              className={
                index === 1
                  ? 'glass relative rounded-lg border-accent/40 p-6'
                  : 'glass rounded-lg p-6'
              }
            >
              {index === 1 && (
                <Badge variant="accent" className="absolute -top-2.5 left-6">
                  Meistgewählt
                </Badge>
              )}
              <p className="font-mono text-2xs uppercase tracking-wide text-fg-subtle">
                {tier.label}
              </p>
              <p className="mt-3 font-mono text-3xl font-medium tabular text-accent">
                −{tier.discount} %
              </p>
              <p className="mt-2 text-sm">ab {tier.qty} Stück</p>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{tier.note}</p>
            </div>
          ))}
        </div>
      </section>

      {bundles.length > 0 && (
        <section className="mt-16" aria-labelledby="bundles-title">
          <h2 id="bundles-title" className="text-2xl font-semibold tracking-tight">
            Fertige Grossmengen-Pakete
          </h2>
          <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
            Vorkonfigurierte Displays und Kartons mit den umsatzstärksten Sorten. Preise netto
            zuzüglich USt.
          </p>
          <ProductGrid products={bundles} className="mt-6" />
          <p className="mt-4 font-mono text-xs text-fg-subtle">
            Günstigste Position: {formatEur(Math.min(...bundles.map((b) => b.priceCents)))} ·
            Blind-Dropshipping auf Anfrage
          </p>
        </section>
      )}

      <section className="mt-16" aria-labelledby="process-title">
        <h2 id="process-title" className="text-2xl font-semibold tracking-tight">
          So läuft die Zusammenarbeit
        </h2>
        <ol className="mt-7 grid gap-5 lg:grid-cols-4">
          {[
            ['Gewerbenachweis', 'USt-IdNr. und Gewerbeanmeldung hochladen. Prüfung binnen eines Werktags.'],
            ['Konditionen', 'Du erhältst deine Nettopreisliste als CSV oder über unsere REST-API.'],
            ['Bestellung', 'Im Shop mit Gewerbekonto, per CSV-Upload oder direkt über die API.'],
            ['Versand', 'An dein Lager oder blind an deinen Endkunden — pro Bestellung wählbar.'],
          ].map(([title, body], index) => (
            <li key={title} className="glass rounded-lg p-5">
              <span
                className="grid size-7 place-items-center rounded-full border border-accent/40 bg-accent-subtle font-mono text-xs text-accent"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="mt-4 text-sm font-medium">{title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <FaqSection items={FAQ} />
    </div>
  );
}
