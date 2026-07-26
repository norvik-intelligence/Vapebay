import type { Flavour } from '@/lib/types';

/**
 * Flavours are a first-class entity, not a string on a product. They power the
 * /geschmack/[slug] pSEO routes and the taste-finder's scoring, and they let a
 * single "Blaubeere Eis" landing page rank for every brand that makes it.
 */
export const FLAVOURS: Flavour[] = [
  {
    slug: 'blaubeere-eis',
    name: 'Blaubeere Eis',
    profiles: ['fruchtig', 'eis', 'suess'],
    notes: ['Wilde Blaubeere', 'Waldbeeren-Konfitüre', 'Kühler Menthol-Abgang'],
    sweetness: 7,
    coolness: 8,
    description:
      'Das meistverkaufte Profil im deutschen Markt. Dunkle, marmeladige Blaubeere trifft auf einen klaren Menthol-Abgang, der die Süße auffängt statt sie zu überdecken.',
  },
  {
    slug: 'wassermelone-eis',
    name: 'Wassermelone Eis',
    profiles: ['fruchtig', 'eis'],
    notes: ['Saftige Wassermelone', 'Melonenschale', 'Eiskühle'],
    sweetness: 6,
    coolness: 9,
    description:
      'Wässrig-frische Melone mit hohem Kühlanteil. Das Sommerprofil schlechthin — leicht genug für den ganzen Tag.',
  },
  {
    slug: 'mango-eis',
    name: 'Mango Eis',
    profiles: ['fruchtig', 'eis', 'suess'],
    notes: ['Reife Alphonso-Mango', 'Passionsfrucht', 'Leichte Kühle'],
    sweetness: 8,
    coolness: 5,
    description:
      'Cremig-tropische Mango mit einer sauren Passionsfrucht-Spitze. Deutlich weniger Kühle als die Beerenprofile.',
  },
  {
    slug: 'erdbeere-kiwi',
    name: 'Erdbeere Kiwi',
    profiles: ['fruchtig', 'suess'],
    notes: ['Gartenerdbeere', 'Grüne Kiwi', 'Sahniger Ausklang'],
    sweetness: 8,
    coolness: 1,
    description:
      'Ohne Kühlung, dafür mit Tiefe: reife Erdbeere gegen die Säure grüner Kiwi. Der Klassiker für alle, die Menthol nicht mögen.',
  },
  {
    slug: 'doppel-apfel',
    name: 'Doppel Apfel',
    profiles: ['fruchtig', 'tabak'],
    notes: ['Roter Apfel', 'Grüner Apfel', 'Anis-Note'],
    sweetness: 5,
    coolness: 2,
    description:
      'Das orientalische Shisha-Profil: roter und grüner Apfel mit der charakteristischen Anis-Note. Al Fakhers Signature-Geschmack.',
  },
  {
    slug: 'traube-eis',
    name: 'Traube Eis',
    profiles: ['fruchtig', 'eis', 'suess'],
    notes: ['Blaue Traube', 'Traubenbonbon', 'Frostiger Abgang'],
    sweetness: 9,
    coolness: 7,
    description:
      'Bonbon-süße blaue Traube mit kräftiger Kühlung. Eines der intensivsten Profile im Sortiment.',
  },
  {
    slug: 'pfirsich-eis',
    name: 'Pfirsich Eis',
    profiles: ['fruchtig', 'eis'],
    notes: ['Weißer Pfirsich', 'Nektarine', 'Sanfte Kühle'],
    sweetness: 6,
    coolness: 6,
    description:
      'Weicher, floraler Pfirsich mit moderater Kühlung. Das ausgewogenste Profil für lange Sessions.',
  },
  {
    slug: 'cola-eis',
    name: 'Cola Eis',
    profiles: ['getraenk', 'eis', 'suess'],
    notes: ['Cola-Sirup', 'Zitrone', 'Prickelnde Kühle'],
    sweetness: 7,
    coolness: 6,
    description: 'Klassischer Cola-Sirup mit Zitronenspitze und einem Kühleffekt wie Eiswürfel.',
  },
  {
    slug: 'energy-eis',
    name: 'Energy Eis',
    profiles: ['getraenk', 'eis', 'suess'],
    notes: ['Energy-Drink', 'Zitrus', 'Kühler Abgang'],
    sweetness: 8,
    coolness: 7,
    description:
      'Das bekannte Energy-Drink-Profil mit Zitrusnote. Polarisierend, aber mit sehr treuer Anhängerschaft.',
  },
  {
    slug: 'minze-classic',
    name: 'Minze Classic',
    profiles: ['minze', 'eis'],
    notes: ['Pfefferminze', 'Spearmint', 'Anhaltende Kühle'],
    sweetness: 2,
    coolness: 10,
    description:
      'Reine Minze ohne Fruchtanteil. Maximale Kühlung, minimale Süße — der Reset-Knopf zwischen Fruchtsorten.',
  },
  {
    slug: 'tabak-classic',
    name: 'Tabak Classic',
    profiles: ['tabak'],
    notes: ['Virginia-Tabak', 'Getrocknete Nuss', 'Leichte Karamellsüße'],
    sweetness: 3,
    coolness: 0,
    description:
      'Trockener Virginia-Tabak mit nussigem Körper. Das Profil für Umsteiger, die den Zigarettengeschmack suchen.',
  },
  {
    slug: 'blaue-himbeere',
    name: 'Blaue Himbeere',
    profiles: ['fruchtig', 'suess'],
    notes: ['Blaue Himbeere', 'Slush-Sirup', 'Saure Spitze'],
    sweetness: 9,
    coolness: 3,
    description:
      'Slush-Eis-Süße mit deutlicher Säure. Sehr intensiv — funktioniert am besten in 1.0 Ohm oder höher.',
  },
  {
    slug: 'ananas-kokos',
    name: 'Ananas Kokos',
    profiles: ['fruchtig', 'suess'],
    notes: ['Gegrillte Ananas', 'Kokosmilch', 'Vanille-Basis'],
    sweetness: 8,
    coolness: 0,
    description:
      'Piña-Colada im Dampf: karamellisierte Ananas auf cremiger Kokosbasis. Ein Dessert-Profil ohne Kühlung.',
  },
  {
    slug: 'kirsche-eis',
    name: 'Kirsche Eis',
    profiles: ['fruchtig', 'eis', 'suess'],
    notes: ['Sauerkirsche', 'Kirschbonbon', 'Menthol'],
    sweetness: 7,
    coolness: 7,
    description: 'Dunkle Sauerkirsche mit Bonbon-Süße und klarer Mentholkühlung.',
  },
  {
    slug: 'banane-eis',
    name: 'Banane Eis',
    profiles: ['fruchtig', 'suess', 'eis'],
    notes: ['Reife Banane', 'Bananenmilch', 'Leichte Kühle'],
    sweetness: 8,
    coolness: 4,
    description: 'Cremige, reife Banane mit milchigem Körper und dezenter Kühlung.',
  },
  {
    slug: 'zitrone-limette',
    name: 'Zitrone Limette',
    profiles: ['fruchtig', 'getraenk'],
    notes: ['Sizilianische Zitrone', 'Limettenschale', 'Soda'],
    sweetness: 4,
    coolness: 3,
    description:
      'Spritzig-sauer mit wenig Süße. Der Kontrapunkt zu den Beeren- und Bonbonprofilen.',
  },
];

export const flavourBySlug = (slug: string) => FLAVOURS.find((f) => f.slug === slug);

export const PROFILE_LABELS: Record<string, string> = {
  fruchtig: 'Fruchtig',
  suess: 'Süß',
  eis: 'Eis',
  minze: 'Minze',
  tabak: 'Tabak',
  getraenk: 'Getränk',
};
