import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, Cpu } from 'lucide-react';

import { compatibilityFor, similarDevices } from '@/lib/compat';
import { coilSegment, deviceBySlug, parseCoilSegment } from '@/lib/data/devices';
import { brandBySlug } from '@/lib/data/brands';
import { toPublic } from '@/lib/data/catalog';
import { compatibilityFaq, compatibilityRoutes } from '@/lib/seo/pseo';
import { breadcrumbLd, faqLd, itemListLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumbs, FaqSection, PageHeader, SpecTable } from '@/components/site/page-shell';
import { ProductCard } from '@/components/commerce/product-card';

interface Params {
  params: Promise<{ device: string; coil: string }>;
}

/**
 * pSEO template 1: /kompatibel/[device-slug]/[coil-ohm]
 *
 * One page per (device × resistance). Highest commercial intent in the whole
 * site — the visitor already owns the hardware and is looking for a consumable.
 */
export function generateStaticParams() {
  return compatibilityRoutes().map((route) => ({
    device: route.deviceSlug,
    coil: route.coilOhm,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { device: deviceSlug, coil } = await params;
  const device = deviceBySlug(deviceSlug);
  const ohm = parseCoilSegment(coil);
  if (!device || ohm === null) return {};

  const report = compatibilityFor(deviceSlug, ohm);
  const count = report?.pods.length ?? 0;

  return {
    title: `${device.name} ${ohm.toFixed(1)} Ohm Pods — ${count} passende Artikel`,
    description: `Alle Pods, Coils und Liquids, die zu 100 % in die ${device.name} mit ${ohm.toFixed(
      1,
    )} Ohm passen. Inklusive PG/VG-Tabelle und passender Nikotinstärke. Versand am selben Tag.`,
    alternates: { canonical: `/kompatibel/${device.slug}/${coil}` },
  };
}

export default async function CompatibilityPage({ params }: Params) {
  const { device: deviceSlug, coil } = await params;
  const ohm = parseCoilSegment(coil);
  if (ohm === null) notFound();

  const report = compatibilityFor(deviceSlug, ohm);
  if (!report) notFound();

  const { device } = report;
  // A resistance the device does not accept must not resolve — otherwise the
  // generator would happily mint /kompatibel/xros-3/9-9-ohm-pod.
  if (!device.coilOhms.includes(ohm)) notFound();

  const brand = brandBySlug(device.brandSlug)!;
  const faq = compatibilityFaq(device, ohm, report.pods.length);
  const topLiquids = report.perfectLiquids.slice(0, 8);
  const similar = similarDevices(device.slug);

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Kompatibilität', path: '/kompatibel' },
    { name: device.name, path: `/kompatibel/${device.slug}/${coilSegment(device.coilOhms[0])}` },
    { name: `${ohm.toFixed(1)} Ohm`, path: `/kompatibel/${device.slug}/${coil}` },
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
              report.pods,
              (p) => `/produkt/${p.slug}`,
              `Pods für ${device.name} ${ohm.toFixed(1)} Ohm`,
            ),
          ]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <>
            <Cpu className="size-3.5" aria-hidden />
            Kompatibilitäts-Matcher
          </>
        }
        title={`Was passt in die ${device.name} bei ${ohm.toFixed(1)} Ohm?`}
        description={`${device.summary} Diese Seite listet ausschließlich Artikel, die mechanisch und elektrisch zur ${device.podFamily.toUpperCase()}-Serie passen — geprüft gegen den Anschlusstyp, das Widerstandsfenster und die zulässige PG/VG-Spanne.`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">
            <CheckCircle2 className="size-3" aria-hidden />
            {report.pods.length === 1 ? '1 passender Pod' : `${report.pods.length} passende Pods`}
          </Badge>
          <Badge>{device.drawStyle}-Zug</Badge>
          <Badge>Empfohlen: {report.recommendedMg} mg/ml</Badge>
          <Badge>
            {100 - device.idealVg}/{device.idealVg} PG/VG
          </Badge>
        </div>
      </PageHeader>

      {/* Resistance switcher — the internal-link mesh that makes the template
          worth generating: every variant links to every sibling. */}
      <nav aria-label="Widerstand wechseln" className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-muted">Anderer Widerstand:</span>
        {device.coilOhms.map((value) => {
          const active = value === ohm;
          return (
            <Link
              key={value}
              href={`/kompatibel/${device.slug}/${coilSegment(value)}`}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded-md border border-accent bg-accent px-3.5 py-1.5 font-mono text-sm tabular text-accent-fg'
                  : 'rounded-md border border-line bg-white/[0.02] px-3.5 py-1.5 font-mono text-sm tabular text-fg-muted transition-colors hover:border-accent hover:text-accent'
              }
            >
              {value.toFixed(1)} Ω
            </Link>
          );
        })}
      </nav>

      <section className="mt-12" aria-labelledby="pods-title">
        <h2 id="pods-title" className="text-2xl font-semibold tracking-tight">
          Passende Pods & Coils
        </h2>
        {report.pods.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {report.pods.map((product) => (
              <ProductCard key={product.id} product={toPublic(product)} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-warning/30 bg-warning-subtle p-5 text-sm text-warning">
            Für diese Kombination ist aktuell kein Pod lieferbar. Wähle oben einen anderen
            Widerstand.
          </p>
        )}
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="specs-title">
        {/* min-w-0: without it this grid track is sized by the table's
            min-w-[32rem], which pushes the whole page wider than the viewport
            on mobile instead of letting the table scroll inside its wrapper. */}
        <div className="min-w-0">
          <h2 id="specs-title" className="text-2xl font-semibold tracking-tight">
            PG/VG-Kompatibilität
          </h2>
          <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
            Das Mischungsverhältnis von Propylenglykol (PG) und pflanzlichem Glycerin (VG) bestimmt,
            wie schnell Liquid in die Watte nachgezogen wird. Zu dickflüssig heißt trockene Züge und
            verbrannte Watte; zu dünnflüssig heißt Fluten, Spucken und Auslaufen aus dem Luftkanal.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">
                PG/VG-Verträglichkeit der {device.name} bei {ohm.toFixed(1)} Ohm
              </caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    PG/VG
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Eignung
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Verhalten im {ohm.toFixed(1)}-Ohm-Coil
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ['70/30', 30],
                  ['60/40', 40],
                  ['50/50', 50],
                  ['40/60', 60],
                  ['30/70', 70],
                ].map(([label, vg]) => {
                  const value = vg as number;
                  const inRange = value >= device.vgRange[0] && value <= device.vgRange[1];
                  const ideal = value === device.idealVg;
                  return (
                    <tr key={label as string}>
                      <th scope="row" className="py-3 pr-4 text-left font-mono font-normal tabular">
                        {label as string}
                      </th>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            ideal
                              ? 'font-medium text-accent'
                              : inRange
                                ? 'text-fg-muted'
                                : 'text-warning'
                          }
                        >
                          {ideal ? 'Optimal' : inRange ? 'Geeignet' : 'Nicht empfohlen'}
                        </span>
                      </td>
                      <td className="py-3 text-fg-muted">
                        {ideal
                          ? 'Ideale Kapillarwirkung, volle Aromadichte, keine Kondensatbildung.'
                          : inRange
                            ? value < device.idealVg
                              ? 'Etwas dünner: kräftigerer Throat Hit, minimal höherer Verbrauch.'
                              : 'Etwas dicker: mehr Dampf, leicht gedämpftes Aroma.'
                            : value > device.vgRange[1]
                              ? 'Zu zäh — die Watte läuft trocken, der Coil brennt an.'
                              : 'Zu dünn — Liquid flutet den Coil, Spucken und Auslaufen.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gerätedaten</h2>
          <SpecTable
            className="mt-6"
            rows={[
              ['Hersteller', brand.name],
              ['Pod-Serie', device.podFamily.toUpperCase()],
              ['Zugtyp', device.drawStyle],
              ['Widerstände', device.coilOhms.map((o) => `${o.toFixed(1)} Ω`).join(' · ')],
              ['Leistung', `${device.wattageRange[0]}–${device.wattageRange[1]} W`],
              ['Akku', `${device.batteryMah} mAh`],
              ['Tank', `${device.podCapacityMl} ml`],
              ['Nachfüllbar', device.refillable ? 'Ja' : 'Nein (Prefilled-Pods)'],
              ['Max. Nikotin', `${device.maxNicotineMg} mg/ml`],
              ['Marktstart', String(device.releaseYear)],
            ]}
          />

          <Button asChild variant="secondary" className="mt-5 w-full">
            <Link href={`/produkt/${device.slug}`}>
              {device.name} ansehen
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="liquids-title">
        <h2 id="liquids-title" className="text-2xl font-semibold tracking-tight">
          Optimale Liquids für {ohm.toFixed(1)} Ohm
        </h2>
        <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
          Gefiltert auf {report.recommendedMg} mg/ml und ein PG/VG-Verhältnis im Fenster der{' '}
          {device.name}. Jede Karte nennt den konkreten Grund für die Einstufung.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topLiquids.map((fit) => (
            <ProductCard
              key={fit.product.id}
              product={toPublic(fit.product)}
              fitReason={fit.reason}
              fitLevel={fit.level}
            />
          ))}
        </div>
      </section>

      <FaqSection items={faq} className="mt-4" />

      {similar.length > 0 && (
        <section className="border-t border-line pt-12" aria-labelledby="similar-title">
          <h2 id="similar-title" className="text-lg font-semibold tracking-tight">
            Ähnliche Geräte
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {similar.map((d) => (
              <li key={d.slug}>
                <Link
                  href={
                    d.podFamily === 'disposable'
                      ? `/produkt/${d.slug}`
                      : `/kompatibel/${d.slug}/${coilSegment(d.coilOhms[0])}`
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.02] px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {d.name}
                  <span className="font-mono text-2xs text-fg-subtle">{d.drawStyle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="mt-12 flex gap-3 rounded-md border border-line bg-white/[0.02] p-5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
        <p className="text-xs leading-relaxed text-fg-subtle">
          Kompatibilitätsangaben basieren auf Herstellerspezifikationen und eigenen Messungen. Sie
          gelten für Originalteile — Nachbau-Pods können trotz passender Bauform abweichende
          Widerstände liefern. Im Zweifel hilft der Support weiter.
        </p>
      </aside>
    </div>
  );
}
