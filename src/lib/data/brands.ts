import type { Brand, Category } from '@/lib/types';

export const CATEGORIES: Category[] = [
  {
    slug: 'pod-systeme',
    name: 'Pod-Systeme',
    short: 'Nachfüllbare Geräte',
    description:
      'Nachfüllbare Akkuträger mit Wechselpods. Die günstigste und nachhaltigste Art zu dampfen — ein Gerät, hunderte Geschmacksrichtungen.',
    icon: 'Zap',
  },
  {
    slug: 'ersatz-pods-coils',
    name: 'Ersatz-Pods & Coils',
    short: 'Verschleißteile',
    description:
      'Verdampferköpfe und Ersatzpods für alle gängigen Geräte. Passgenau gefiltert — keine Fehlkäufe mehr.',
    icon: 'CircleDot',
  },
  {
    slug: 'nicsalts',
    name: 'Overdosed NicSalts',
    short: '10 & 20 mg/ml',
    description:
      'Nikotinsalz-Liquids mit weichem Throat Hit. Ideal für MTL-Pod-Systeme und Umsteiger von der Zigarette.',
    icon: 'Droplets',
  },
  {
    slug: 'liquids',
    name: 'Liquids',
    short: '50/50 PG/VG',
    description:
      'Klassische Freebase-Liquids in 50/50 und 70/30. Für jedes Gerät die richtige Konsistenz.',
    icon: 'FlaskConical',
  },
  {
    slug: 'einweg-vapes',
    name: 'Einweg-Vapes',
    short: 'Sofort startklar',
    description:
      'Vorgefüllte Einweggeräte von 600 bis 12.000 Zügen. Auspacken, ziehen, fertig — TPD2-konform.',
    icon: 'Wind',
  },
  {
    slug: 'b2b-bundles',
    name: 'B2B Grossmengen',
    short: 'Ab 50 Stück',
    description:
      'Staffelpreise für Kioske, Shishabars und Fachhandel. Netto-Preise, Blind-Dropshipping auf Wunsch.',
    icon: 'Boxes',
  },
];

export const BRANDS: Brand[] = [
  {
    slug: 'randm',
    name: 'RandM',
    tagline: 'Der Langstrecken-Spezialist unter den Einweg-Vapes',
    country: 'CN',
    founded: 2019,
    mark: 'RM',
    description:
      'RandM hat die Tornado-Serie zum Maßstab für Laufzeit gemacht. Mesh-Coils, wiederaufladbare Akkus und Zugzahlen von 7.000 bis 12.000 — bei konstant hoher Aromadichte bis zum letzten Zug.',
    categories: ['einweg-vapes', 'b2b-bundles'],
  },
  {
    slug: 'elfbar',
    name: 'Elfbar',
    tagline: 'Die meistverkaufte Vape-Marke Europas',
    country: 'CN',
    founded: 2018,
    mark: 'EB',
    description:
      'Elfbar deckt das komplette Spektrum ab: die ELFA- und ELFX-Pod-Systeme für nachhaltiges Dampfen, dazu die klassischen 600er-Disposables. Konsistente Fertigungsqualität und die breiteste Geschmacksauswahl im Markt.',
    categories: ['pod-systeme', 'ersatz-pods-coils', 'einweg-vapes', 'nicsalts'],
  },
  {
    slug: 'flerbar',
    name: 'Flerbar',
    tagline: 'Kompromisslos aromaintensiv',
    country: 'CN',
    founded: 2020,
    mark: 'FB',
    description:
      'Flerbar setzt auf kräftige, süße Geschmacksprofile und ein extrem kompaktes Gehäuse. Die M600-Serie gehört zu den meistgekauften Einsteiger-Vapes im DACH-Raum.',
    categories: ['einweg-vapes', 'b2b-bundles'],
  },
  {
    slug: 'lost-mary',
    name: 'Lost Mary',
    tagline: 'Design-getriebenes Dampfen',
    country: 'CN',
    founded: 2021,
    mark: 'LM',
    description:
      'Lost Mary kombiniert ergonomische Gehäuse mit ausgewogenen Aromen. Die BM600 ist der Klassiker, das Tappo-System der nachfüllbare Nachfolger mit austauschbaren Pods.',
    categories: ['einweg-vapes', 'pod-systeme', 'ersatz-pods-coils'],
  },
  {
    slug: 'hqd',
    name: 'HQD',
    tagline: 'Der US-Pionier im Pod-Segment',
    country: 'US',
    founded: 2017,
    mark: 'HQ',
    description:
      'HQD zählt zu den ältesten Marken im Segment. Cuvie steht für unkomplizierte Einweggeräte, Cirak für ein modulares Pod-System mit besonders langlebigen Keramik-Coils.',
    categories: ['einweg-vapes', 'pod-systeme', 'ersatz-pods-coils'],
  },
  {
    slug: 'al-fakher',
    name: 'Al Fakher',
    tagline: 'Shisha-Aromen, neu interpretiert',
    country: 'AE',
    founded: 1999,
    mark: 'AF',
    description:
      'Al Fakher überträgt 25 Jahre Shisha-Tabak-Expertise auf Vapes. Die Crown Bar Serie und die hauseigenen NicSalts liefern die typischen orientalischen Frucht- und Minzprofile mit ungewöhnlicher Tiefe.',
    categories: ['einweg-vapes', 'nicsalts', 'liquids', 'b2b-bundles'],
  },
  {
    slug: 'vaporesso',
    name: 'Vaporesso',
    tagline: 'Hardware-Engineering aus Shenzhen',
    country: 'CN',
    founded: 2015,
    mark: 'VP',
    description:
      'Vaporesso baut die technisch ausgereiftesten Pod-Systeme im Einsteigersegment. Die XROS-Reihe mit COREX-Heating-Technologie gilt als Referenz für Geschmackstreue bei MTL-Zug.',
    categories: ['pod-systeme', 'ersatz-pods-coils'],
  },
  {
    slug: 'uwell',
    name: 'Uwell',
    tagline: 'Der Caliburn-Standard',
    country: 'CN',
    founded: 2015,
    mark: 'UW',
    description:
      'Uwells Caliburn-Serie definiert seit 2018 die Messlatte für MTL-Pods. Die Pro-FOCS-Technologie der G3-Generation liefert außergewöhnlich saubere Aromatrennung.',
    categories: ['pod-systeme', 'ersatz-pods-coils'],
  },
];

export const brandBySlug = (slug: string) => BRANDS.find((b) => b.slug === slug);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
