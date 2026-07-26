import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, Globe } from 'lucide-react';

import { totalPseoRoutes } from '@/lib/seo/pseo';
import { loadPseoTemplates } from '@/lib/db/pseo';
import { PRODUCTS } from '@/lib/data/catalog';
import { AdminHeader, Panel, StatTile } from '@/components/admin/primitives';
import { PseoTemplateCard } from '@/components/admin/pseo-template-card';

export const metadata: Metadata = { title: 'pSEO-Manager' };

// Templates carry DB overrides (prompt, enabled) — read them per request so a
// save in one tab is visible in the next, not after the next build.
export const dynamic = 'force-dynamic';

export default function PseoPage() {
  const templates = loadPseoTemplates();
  const active = templates.filter((t) => t.enabled);
  const totalRoutes = totalPseoRoutes();

  return (
    <>
      <AdminHeader
        title="pSEO-Manager"
        description="Programmatische Landingpages werden zur Buildzeit aus dem Katalog erzeugt. Jedes Template enumeriert seine eigenen Routen — die Zahlen hier sind die tatsächlich gebauten Seiten, keine Schätzung."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Generierte Seiten" value={String(totalRoutes)} sub="statisch vorgerendert" tone="accent" />
        <StatTile label="Aktive Templates" value={`${active.length} / ${templates.length}`} />
        <StatTile label="Produktseiten" value={String(PRODUCTS.length)} sub="mit Product-JSON-LD" />
        <StatTile
          label="Seiten mit FAQ-Schema"
          value={String(totalRoutes)}
          sub="FAQPage + BreadcrumbList"
        />
      </div>

      <section className="mt-8 space-y-5" aria-labelledby="templates-title">
        <h2 id="templates-title" className="text-lg font-semibold tracking-tight">
          Templates
        </h2>
        {templates.map((template) => (
          <PseoTemplateCard
            key={template.id}
            template={{
              id: template.id,
              name: template.name,
              pattern: template.pattern,
              example: template.example,
              intent: template.intent,
              enrichmentPrompt: template.enrichmentPrompt,
              enabled: template.enabled,
              routeCount: template.routeCount(),
            }}
          />
        ))}
      </section>

      <Panel
        title="Strukturierte Daten je Template"
        description="Was pro generierter Seite ausgeliefert wird."
        className="mt-8"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-fg-subtle">
                <th scope="col" className="px-5 py-3 font-medium">Template</th>
                <th scope="col" className="px-5 py-3 font-medium">JSON-LD</th>
                <th scope="col" className="px-5 py-3 font-medium">Generierte Inhalte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                [
                  'Kompatibilitäts-Matcher',
                  'BreadcrumbList, FAQPage, ItemList',
                  'FAQ (5 Fragen), PG/VG-Verträglichkeitstabelle, Gerätedatenblatt, Live-Bestandsbadges, Querverlinkung aller Widerstände',
                ],
                [
                  'Geschmacks-Hub',
                  'BreadcrumbList, FAQPage, ItemList',
                  'FAQ (4 Fragen), Süße-/Kühle-Meter, Aromanoten-Liste, Markenfilter, verwandte Profile',
                ],
                [
                  'Marke × Kategorie',
                  'BreadcrumbList, FAQPage, ItemList',
                  'FAQ (4 Fragen), Sortimentseinleitung, Preis-ab-Angabe, Verfügbarkeitszähler, Cross-Links auf weitere Kategorien',
                ],
                [
                  'Produktdetail',
                  'BreadcrumbList, Product (Offer, AggregateRating, OfferShippingDetails)',
                  'Technisches Datenblatt, Kompatibilitätsliste, Nikotinempfehlung, Geschmacksprofil',
                ],
              ].map(([name, schema, content]) => (
                <tr key={name}>
                  <th scope="row" className="px-5 py-3 text-left text-xs font-normal">{name}</th>
                  <td className="px-5 py-3 font-mono text-2xs text-accent">{schema}</td>
                  <td className="measure px-5 py-3 text-xs leading-relaxed text-fg-muted">{content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Sitemap & Indexierung"
        description="Alle generierten Routen laufen automatisch in die Sitemap."
        className="mt-6"
      >
        <div className="flex flex-wrap gap-3 p-5">
          {[
            ['/sitemap.xml', 'Sitemap'],
            ['/robots.txt', 'robots.txt'],
            ['/kompatibel', 'Kompatibilitäts-Index'],
            ['/geschmack', 'Geschmacks-Index'],
            ['/marken', 'Marken-Index'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.02] px-3.5 py-2 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Globe className="size-3.5" aria-hidden />
              {label}
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          ))}
        </div>
      </Panel>
    </>
  );
}
