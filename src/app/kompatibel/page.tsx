import type { Metadata } from 'next';
import Link from 'next/link';
import { Cpu } from 'lucide-react';

import { DEVICES, coilSegment } from '@/lib/data/devices';
import { brandBySlug } from '@/lib/data/brands';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo/jsonld';
import { compatibilityRoutes } from '@/lib/seo/pseo';
import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';
import { CompatibilityFinder } from '@/components/commerce/compatibility-finder';

export const metadata: Metadata = {
  title: 'Kompatibilitäts-Finder — welcher Pod passt in mein Gerät?',
  description:
    'Wähle dein Gerät und den Widerstand: Wir zeigen ausschließlich Pods, Coils und Liquids, die zu 100 % passen. Inklusive PG/VG-Tabelle und Nikotinempfehlung.',
  alternates: { canonical: '/kompatibel' },
};

export default function CompatibilityIndexPage() {
  const refillable = DEVICES.filter((d) => d.podFamily !== 'disposable');
  const disposables = DEVICES.filter((d) => d.podFamily === 'disposable');

  const pickerDevices = DEVICES.map(({ slug, name, brandSlug, coilOhms, podFamily, drawStyle }) => ({
    slug,
    name,
    brandSlug,
    coilOhms,
    podFamily,
    drawStyle,
  }));

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Kompatibilität', path: '/kompatibel' },
  ];

  return (
    <div className="container pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd(crumbs)) }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <>
            <Cpu className="size-3.5" aria-hidden />
            {compatibilityRoutes().length} geprüfte Kombinationen
          </>
        }
        title="Welcher Pod passt in mein Gerät?"
        description="Pods sind nur innerhalb derselben Geräteserie kompatibel. Ein XROS-Pod hält magnetisch auch in einer Caliburn — die Kontaktfläche sitzt aber anders, und das Gerät zündet nicht. Diese Seite verhindert genau diesen Fehlkauf."
      />

      <CompatibilityFinder devices={pickerDevices} />

      <section className="mt-16" aria-labelledby="devices-title">
        <h2 id="devices-title" className="text-2xl font-semibold tracking-tight">
          Alle Pod-Systeme im Index
        </h2>
        <p className="measure mt-3 text-sm leading-relaxed text-fg-muted">
          Jedes Gerät hat eine eigene Detailseite pro Widerstand — mit PG/VG-Tabelle, passender
          Nikotinstärke und Lagerbestand.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {refillable.map((device) => {
            const brand = brandBySlug(device.brandSlug);
            return (
              <article key={device.slug} className="glass rounded-lg p-5">
                <p className="font-mono text-2xs uppercase tracking-wide text-fg-subtle">
                  {brand?.name}
                </p>
                <h3 className="mt-1.5 text-base font-medium">{device.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-fg-muted">{device.summary}</p>

                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-2xs text-fg-subtle">
                  <div className="flex gap-1.5">
                    <dt>Zug</dt>
                    <dd className="text-fg-muted">{device.drawStyle}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Akku</dt>
                    <dd className="text-fg-muted">{device.batteryMah} mAh</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Serie</dt>
                    <dd className="text-fg-muted">{device.podFamily.toUpperCase()}</dd>
                  </div>
                </dl>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {device.coilOhms.map((ohm) => (
                    <li key={ohm}>
                      <Link
                        href={`/kompatibel/${device.slug}/${coilSegment(ohm)}`}
                        className="inline-flex rounded-sm border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-2xs tabular text-fg-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        {ohm.toFixed(1)} Ω
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="disposables-title">
        <h2 id="disposables-title" className="text-lg font-semibold tracking-tight">
          Einweggeräte
        </h2>
        <p className="measure mt-2 text-sm leading-relaxed text-fg-muted">
          Diese Geräte haben einen fest verbauten Coil und werden nach dem Verbrauch entsorgt. Es
          gibt keine passenden Ersatzteile — nur ein neues Gerät oder den Umstieg auf ein
          nachfüllbares System.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {disposables.map((device) => (
            <li key={device.slug}>
              <Link
                href={`/produkt/${device.slug}`}
                className="inline-flex rounded-md border border-line bg-white/[0.02] px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
              >
                {device.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
