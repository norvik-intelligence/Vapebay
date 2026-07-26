import type { Metadata } from 'next';
import Link from 'next/link';
import { Droplets } from 'lucide-react';

import { FLAVOURS, PROFILE_LABELS } from '@/lib/data/flavours';
import { productsByFlavour } from '@/lib/data/catalog';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, PageHeader } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Alle Geschmacksrichtungen',
  description:
    'Von Blaubeere Eis bis Tabak Classic: alle Geschmacksprofile mit Süße- und Kühle-Einordnung, Aromanoten und verfügbaren Nikotinstärken.',
  alternates: { canonical: '/geschmack' },
};

export default function FlavourIndexPage() {
  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Geschmack', path: '/geschmack' },
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
            <Droplets className="size-3.5" aria-hidden />
            {FLAVOURS.length} Profile
          </>
        }
        title="Geschmacksrichtungen"
        description="Jedes Profil mit Aromanoten, Süße- und Kühle-Wert. Wer noch nicht weiß, was passt, kommt über den Geschmacks-Finder in 30 Sekunden zu einer Empfehlung."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FLAVOURS.map((flavour) => {
          const count = productsByFlavour(flavour.slug).length;
          return (
            <Link
              key={flavour.slug}
              href={`/geschmack/${flavour.slug}`}
              className="glass glass-hover group flex flex-col rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-medium group-hover:text-accent">{flavour.name}</h2>
                <span className="shrink-0 font-mono text-2xs text-fg-subtle">{count} Artikel</span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                {flavour.notes.join(' · ')}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {flavour.profiles.map((profile) => (
                  <Badge key={profile}>{PROFILE_LABELS[profile]}</Badge>
                ))}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 font-mono text-2xs">
                <div>
                  <dt className="text-fg-subtle">Süße</dt>
                  <dd className="mt-1 tabular text-fg-muted">{flavour.sweetness}/10</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Kühle</dt>
                  <dd className="mt-1 tabular text-fg-muted">{flavour.coolness}/10</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
