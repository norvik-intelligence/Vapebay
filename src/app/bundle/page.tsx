import type { Metadata } from 'next';
import { Gift } from 'lucide-react';

import { PRODUCTS, publicProducts } from '@/lib/data/catalog';
import { BUNDLE_TIERS } from '@/lib/bundle';
import { stockLevel } from '@/lib/utils';
import { breadcrumbLd, faqLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs, FaqSection, PageHeader } from '@/components/site/page-shell';
import { BundleBuilder } from '@/components/commerce/bundle-builder';

export const metadata: Metadata = {
  title: 'Bundle Builder — bis zu 15 % Rabatt auf dein Set',
  description:
    '1 Gerät + 2 Pod-Packs + 5 Liquids = 15 % Rabatt. Stell dir dein Set selbst zusammen, der Rabatt wird live berechnet und im Warenkorb automatisch abgezogen.',
  alternates: { canonical: '/bundle' },
};

const FAQ = [
  {
    q: 'Wie funktioniert der Bundle-Rabatt?',
    a: 'Sobald dein Warenkorb 1 Gerät, 2 Pod-Packs und 5 Liquids enthält, werden 15 % auf alle Artikel im Set abgezogen. Für 1 Gerät, 1 Pod-Pack und 3 Liquids gibt es 10 %. Der Rabatt wird automatisch berechnet — kein Gutscheincode nötig.',
  },
  {
    q: 'Kann ich Artikel verschiedener Marken kombinieren?',
    a: 'Ja, mit einer Einschränkung: Pods müssen zur Serie deines Geräts passen. Der Builder filtert das automatisch — wählst du eine Vaporesso XROS, siehst du in Schritt 2 nur XROS-Pods. Liquids sind markenübergreifend frei kombinierbar, alle sind 50/50 PG/VG.',
  },
  {
    q: 'Gilt der Rabatt auch auf reduzierte Artikel?',
    a: 'Ja. Der Bundle-Rabatt wird auf den bereits reduzierten Preis gerechnet und ist mit laufenden Aktionen kombinierbar. Ausgenommen sind ausschließlich B2B-Grossmengen, die bereits zu Nettopreisen kalkuliert sind.',
  },
  {
    q: 'Wie lange reicht ein Pro-Set?',
    a: 'Bei durchschnittlichem Konsum von rund 3 ml täglich reichen 5 Liquids etwa 16 Tage, die 2 Pod-Packs (4 Pods) rund 4 bis 6 Wochen. Das Set ist auf einen Monatsbedarf ausgelegt.',
  },
];

export default function BundlePage() {
  const available = PRODUCTS.filter((p) => stockLevel(p.stock) !== 'out_of_stock');

  const devices = publicProducts(
    available.filter((p) => p.kind === 'device').sort((a, b) => b.rating - a.rating),
  );
  const pods = publicProducts(
    available.filter((p) => p.kind === 'pod' || p.kind === 'coil'),
  );
  const liquids = publicProducts(
    available
      .filter((p) => p.kind === 'liquid' || p.kind === 'nicsalt')
      .sort((a, b) => b.rating - a.rating),
  );

  const crumbs = [
    { name: 'Start', path: '/' },
    { name: 'Bundle Builder', path: '/bundle' },
  ];

  return (
    <div className="container pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([breadcrumbLd(crumbs), faqLd(FAQ)]),
        }}
      />

      <Breadcrumbs crumbs={crumbs} className="pt-8" />

      <PageHeader
        eyebrow={
          <>
            <Gift className="size-3.5" aria-hidden />
            Bundle Builder
          </>
        }
        title="Stell dir dein Set zusammen"
        description="Gerät wählen, passende Pods dazu, Liquids ergänzen. Der Rabatt wird live berechnet und im Warenkorb automatisch abgezogen — kein Gutscheincode, keine Mindestlaufzeit."
      >
        <div className="flex flex-wrap gap-2">
          {BUNDLE_TIERS.map((tier) => (
            <Badge key={tier.id} variant={tier.id === 'pro' ? 'accent' : 'neutral'}>
              {tier.name}: {Math.round(tier.discount * 100)} %
            </Badge>
          ))}
        </div>
      </PageHeader>

      <BundleBuilder devices={devices} pods={pods} liquids={liquids} />

      <FaqSection items={FAQ} />
    </div>
  );
}
