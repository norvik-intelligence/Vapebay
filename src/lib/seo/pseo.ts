import { BRANDS, CATEGORIES, categoryBySlug } from '@/lib/data/brands';
import { DEVICES, coilSegment } from '@/lib/data/devices';
import { FLAVOURS, PROFILE_LABELS } from '@/lib/data/flavours';
import { PRODUCTS } from '@/lib/data/catalog';
import { nicotineRationale, recommendedNicotineMg } from '@/lib/compat';
import type { Device, Flavour } from '@/lib/types';

/**
 * The pSEO engine.
 *
 * Each template enumerates its own routes and generates its own FAQ + copy from
 * catalog data. `generateStaticParams` calls the enumerator; the admin pSEO
 * manager reads the same registry, so the count shown in the dashboard is the
 * real number of pages that get built — not a hand-typed estimate.
 */

export interface PseoTemplate {
  id: string;
  name: string;
  pattern: string;
  example: string;
  /** The search intent this template captures. Shown in the admin manager. */
  intent: string;
  /** Prompt used by the AI text-enrichment step for this template. */
  enrichmentPrompt: string;
  enabled: boolean;
  routeCount: () => number;
}

export const PSEO_TEMPLATES: PseoTemplate[] = [
  {
    id: 'kompatibel',
    name: 'Kompatibilitäts-Matcher',
    pattern: '/kompatibel/[device-slug]/[coil-ohm]',
    example: '/kompatibel/vaporesso-xros-3/0-6-ohm-pod',
    intent:
      'Transaktional mit hoher Kaufabsicht: "welcher pod passt in xros 3" — der Nutzer besitzt das Gerät bereits und braucht Verschleißteile.',
    enrichmentPrompt:
      'Schreibe 2 Absätze über die Kombination aus {{device}} und {{ohm}} Ohm Coil. Erkläre den Zugwiderstand, den Liquidverbrauch und die passende Nikotinstärke. Sachlich, keine Superlative, kein Marketing-Sprech. Zielgruppe: Umsteiger von der Zigarette.',
    enabled: true,
    routeCount: () => compatibilityRoutes().length,
  },
  {
    id: 'geschmack',
    name: 'Geschmacks-Hub',
    pattern: '/geschmack/[flavour-slug]',
    example: '/geschmack/blaubeere-eis',
    intent:
      'Discovery: "blaubeere eis liquid" — markenagnostische Suche nach einem Geschmacksprofil.',
    enrichmentPrompt:
      'Beschreibe das Geschmacksprofil {{flavour}} in 2 Absätzen. Nenne die Aromanoten von Antritt bis Abgang, ordne Süße und Kühle ein und nenne ein Vergleichsprofil für Nutzer, die es noch nicht kennen.',
    enabled: true,
    routeCount: () => flavourRoutes().length,
  },
  {
    id: 'marken',
    name: 'Marke × Kategorie',
    pattern: '/marken/[brand-slug]/[category-slug]',
    example: '/marken/randm/einweg-vapes',
    intent:
      'Navigational-kommerziell: "randm tornado kaufen" — markenbewusster Nutzer mit konkreter Kategorie.',
    enrichmentPrompt:
      'Schreibe eine Sortiments-Einleitung für {{brand}} in der Kategorie {{category}}. Nenne die Positionierung der Marke, das typische Preisniveau und für wen sich das Sortiment eignet.',
    enabled: true,
    routeCount: () => brandCategoryRoutes().length,
  },
];

// ── Route enumeration ──────────────────────────────────────────────────────

export interface CompatibilityRoute {
  deviceSlug: string;
  coilOhm: string;
}

export function compatibilityRoutes(): CompatibilityRoute[] {
  return DEVICES.filter((d) => d.podFamily !== 'disposable').flatMap((device) =>
    device.coilOhms.map((ohm) => ({
      deviceSlug: device.slug,
      coilOhm: coilSegment(ohm),
    })),
  );
}

export function flavourRoutes(): { flavourSlug: string }[] {
  return FLAVOURS.map((flavour) => ({ flavourSlug: flavour.slug }));
}

export function brandCategoryRoutes(): { brandSlug: string; categorySlug: string }[] {
  return BRANDS.flatMap((brand) =>
    brand.categories
      // Only emit a route if it would actually have products. An empty landing
      // page is a thin-content penalty waiting to happen.
      .filter((category) =>
        PRODUCTS.some((p) => p.brandSlug === brand.slug && p.categorySlug === category),
      )
      .map((category) => ({ brandSlug: brand.slug, categorySlug: category })),
  );
}

export function totalPseoRoutes(): number {
  return PSEO_TEMPLATES.filter((t) => t.enabled).reduce((sum, t) => sum + t.routeCount(), 0);
}

// ── FAQ generators ─────────────────────────────────────────────────────────

export interface Faq {
  q: string;
  a: string;
}

export function compatibilityFaq(device: Device, ohm: number, podCount: number): Faq[] {
  const mg = recommendedNicotineMg(ohm);
  const [vgMin, vgMax] = device.vgRange;

  return [
    {
      q: `Welche Pods passen in die ${device.name}?`,
      a: `In die ${device.name} passen ausschließlich Pods der ${device.podFamily.toUpperCase()}-Serie. Aktuell führen wir ${podCount} passende Varianten mit ${device.coilOhms
        .map((o) => `${o.toFixed(1)} Ohm`)
        .join(', ')}. Pods anderer Hersteller oder anderer Serien desselben Herstellers sind mechanisch nicht kompatibel — der Magnetanschluss und die Kontaktfläche unterscheiden sich.`,
    },
    {
      q: `Welche Nikotinstärke ist bei ${ohm.toFixed(1)} Ohm richtig?`,
      a: nicotineRationale(ohm),
    },
    {
      q: `Welches PG/VG-Verhältnis braucht die ${device.name}?`,
      a: `Optimal sind ${100 - device.idealVg}/${device.idealVg} PG/VG. Der Coil verträgt ein Fenster von ${100 - vgMax}/${vgMax} bis ${100 - vgMin}/${vgMin}. Zu dickflüssiges Liquid (über ${vgMax} % VG) wird nicht schnell genug nachgezogen und der Coil brennt trocken; zu dünnes Liquid flutet den Coil und führt zu Spucken und Auslaufen.`,
    },
    {
      q: `Wie lange hält ein ${ohm.toFixed(1)}-Ohm-Pod?`,
      a: `Bei durchschnittlichem Gebrauch von rund 3 ml Liquid pro Tag hält ein Pod ${
        ohm <= 0.7 ? '5 bis 7' : '8 bis 12'
      } Tage. ${
        ohm <= 0.7
          ? 'Niedrige Widerstände arbeiten heißer und verschleißen die Watte schneller.'
          : 'Höhere Widerstände sind materialschonender und halten deutlich länger.'
      } Stark süße oder gefärbte Liquids verkürzen die Standzeit um etwa ein Drittel.`,
    },
    {
      q: `Ist die ${device.name} für Umsteiger geeignet?`,
      a: `${
        device.drawStyle === 'MTL'
          ? `Ja. Die ${device.name} nutzt einen MTL-Zug (Mund-zu-Lunge), der dem Zugverhalten einer Zigarette entspricht. Das ist der Zugtyp, den Umsteiger als vertraut empfinden.`
          : `Bedingt. Die ${device.name} ist auf einen ${device.drawStyle}-Zug ausgelegt, also einen offeneren Luftstrom als bei einer Zigarette. Für den direkten Umstieg empfehlen wir ein reines MTL-Gerät.`
      } Der Akku mit ${device.batteryMah} mAh reicht bei normalem Gebrauch ${
        device.batteryMah >= 900 ? 'einen vollen Tag' : 'etwa einen halben bis ganzen Tag'
      }.`,
    },
  ];
}

export function flavourFaq(flavour: Flavour, productCount: number): Faq[] {
  return [
    {
      q: `Wonach schmeckt ${flavour.name}?`,
      a: `${flavour.description} Die Aromanoten von Antritt bis Abgang: ${flavour.notes.join(', ')}.`,
    },
    {
      q: `Wie süß ist ${flavour.name}?`,
      a: `Auf einer Skala von 0 bis 10 liegt ${flavour.name} bei ${flavour.sweetness} Punkten Süße und ${flavour.coolness} Punkten Kühle. ${
        flavour.sweetness >= 7
          ? 'Das ist ein deutlich gesüßtes Profil — es verkürzt die Standzeit von Coils spürbar, da Süßstoffe karamellisieren und die Watte zusetzen.'
          : 'Das ist ein zurückhaltend gesüßtes Profil, das Coils schont und sich für den Dauergebrauch eignet.'
      }`,
    },
    {
      q: `Welche Nikotinstärke gibt es für ${flavour.name}?`,
      a: `Wir führen ${flavour.name} als NicSalt in 10 mg/ml und 20 mg/ml sowie als Freebase-Liquid mit 3 mg/ml. Insgesamt sind aktuell ${productCount} Produkte mit diesem Profil verfügbar. 20 mg/ml ist nach TPD2 die gesetzliche Höchstgrenze in der EU.`,
    },
    {
      q: `Passt ${flavour.name} in mein Gerät?`,
      a: `Alle Liquids mit diesem Profil sind 50/50 PG/VG abgefüllt und damit für sämtliche MTL- und RDL-Pod-Systeme geeignet — von der Vaporesso XROS bis zur Uwell Caliburn. Für reine Sub-Ohm-Geräte unter 0.5 Ohm empfehlen wir ein dickflüssigeres 30/70-Liquid.`,
    },
  ];
}

export function brandCategoryFaq(brandSlug: string, categorySlug: string, count: number): Faq[] {
  const brand = BRANDS.find((b) => b.slug === brandSlug)!;
  const category = categoryBySlug(categorySlug)!;

  return [
    {
      q: `Was zeichnet ${brand.name} aus?`,
      a: brand.description,
    },
    {
      q: `Wie viele ${category.name} von ${brand.name} sind verfügbar?`,
      a: `Aktuell führen wir ${count} Artikel von ${brand.name} in der Kategorie ${category.name}. Alle sofort ab Lager verfügbar, Bestellungen bis 15 Uhr gehen am selben Werktag raus.`,
    },
    {
      q: `Sind die ${brand.name} Produkte TPD2-konform?`,
      a: `Ja. Sämtliche bei uns geführten Artikel entsprechen der EU-Tabakproduktrichtlinie 2014/40/EU: maximal 2 ml Tankvolumen bei Einweggeräten, maximal 10 ml Flaschengröße bei nikotinhaltigen Liquids und maximal 20 mg/ml Nikotin. Die Produkte sind beim BVL registriert und in Deutschland verkehrsfähig.`,
    },
    {
      q: `Gibt es ${brand.name} auch als Grossmenge?`,
      a: `Ja. Für Kioske, Fachhandel und Gastronomie bieten wir Staffelpreise ab 50 Stück inklusive Blind-Dropshipping — die Ware geht mit deinem Absender direkt an deinen Endkunden. Netto-Konditionen auf Anfrage über den B2B-Bereich.`,
    },
  ];
}

// ── Copy helpers ───────────────────────────────────────────────────────────

export const profileLabel = (profile: string) => PROFILE_LABELS[profile] ?? profile;

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
