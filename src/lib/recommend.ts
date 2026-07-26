import { z } from 'zod';

import { PRODUCTS, toPublic, type PublicProduct } from '@/lib/data/catalog';
import { FLAVOURS } from '@/lib/data/flavours';
import { DEVICES } from '@/lib/data/devices';
import { recommendedNicotineMg } from '@/lib/compat';
import { stockLevel } from '@/lib/utils';
import type { DrawStyle, FlavourProfile } from '@/lib/types';

/**
 * Taste-finder scoring.
 *
 * Runs on the server so the 250-product catalog (with every summary string)
 * never ships to the client. The quiz posts three answers and gets back six
 * products plus a bundle — about 4 KB instead of 80.
 */

export const TasteAnswersSchema = z.object({
  smokerType: z.enum(['umsteiger', 'gelegenheit', 'erfahren', 'neugierig']),
  profiles: z.array(z.enum(['suess', 'fruchtig', 'eis', 'minze', 'tabak', 'getraenk'])).min(1).max(3),
  nicotine: z.enum(['20', '10', '3', 'unsicher']),
});

export type TasteAnswers = z.infer<typeof TasteAnswersSchema>;

/** Smoker type → the hardware and strength that actually suits them. */
const SMOKER_PROFILE: Record<
  TasteAnswers['smokerType'],
  { draw: DrawStyle; defaultMg: 10 | 20; preferDisposable: boolean; rationale: string }
> = {
  umsteiger: {
    draw: 'MTL',
    defaultMg: 20,
    preferDisposable: false,
    rationale:
      'Als Umsteiger brauchst du einen straffen MTL-Zug, der dem Zugverhalten einer Zigarette entspricht, und 20 mg/ml Nikotinsalz, damit das Verlangen tatsächlich gedeckt wird.',
  },
  gelegenheit: {
    draw: 'MTL',
    defaultMg: 10,
    preferDisposable: true,
    rationale:
      'Bei gelegentlichem Konsum reichen 10 mg/ml. Ein Einweggerät oder ein kompaktes Pod-System ist hier praktischer als ein großer Akkuträger.',
  },
  erfahren: {
    draw: 'RDL',
    defaultMg: 10,
    preferDisposable: false,
    rationale:
      'Du kennst den Unterschied zwischen MTL und RDL. Ein nachfüllbares System mit niedrigem Widerstand gibt dir mehr Dampf und deutlich niedrigere Folgekosten.',
  },
  neugierig: {
    draw: 'MTL',
    defaultMg: 10,
    preferDisposable: true,
    rationale:
      'Zum Ausprobieren empfehlen wir die niedrigste sinnvolle Stärke und ein Gerät ohne Wartungsaufwand. So findest du dein Profil, bevor du dich festlegst.',
  },
};

export interface TasteRecommendation {
  rationale: string;
  nicotineMg: number;
  drawStyle: DrawStyle;
  matchedFlavours: { slug: string; name: string; why: string }[];
  products: PublicProduct[];
  bundle: {
    device: PublicProduct | null;
    pods: PublicProduct[];
    liquids: PublicProduct[];
    subtotalCents: number;
    discountedCents: number;
    savingsCents: number;
  };
}

export function recommend(answers: TasteAnswers): TasteRecommendation {
  const profile = SMOKER_PROFILE[answers.smokerType];
  const targetMg =
    answers.nicotine === 'unsicher' ? profile.defaultMg : Number(answers.nicotine);

  // ── Flavours ────────────────────────────────────────────────────────────
  const wanted = answers.profiles as FlavourProfile[];
  const scoredFlavours = FLAVOURS.map((flavour) => {
    const overlap = flavour.profiles.filter((p) => wanted.includes(p)).length;
    // An exact profile set beats a partial one; ties break on how strongly the
    // flavour expresses the requested dimension.
    const intensity = wanted.includes('eis')
      ? flavour.coolness
      : wanted.includes('suess')
        ? flavour.sweetness
        : 5;
    return { flavour, score: overlap * 10 + intensity };
  })
    .filter((entry) => entry.score >= 10)
    .sort((a, b) => b.score - a.score);

  const topFlavours = scoredFlavours.slice(0, 4);
  const topSlugs = topFlavours.map((f) => f.flavour.slug);

  // ── Hardware ────────────────────────────────────────────────────────────
  const deviceCandidates = DEVICES.filter((d) => {
    if (profile.preferDisposable) return true;
    return d.podFamily !== 'disposable';
  })
    .map((d) => ({
      device: d,
      score:
        (d.drawStyle === profile.draw ? 30 : 0) +
        (profile.preferDisposable === (d.podFamily === 'disposable') ? 15 : 0) +
        d.popularity / 5,
    }))
    .sort((a, b) => b.score - a.score);

  const bestDevice = deviceCandidates[0]?.device ?? null;

  const deviceProduct = bestDevice
    ? (PRODUCTS.find((p) => p.deviceSlug === bestDevice.slug && stockLevel(p.stock) !== 'out_of_stock') ??
      null)
    : null;

  // ── Liquids matching both flavour and strength ──────────────────────────
  const liquidMatches = PRODUCTS.filter(
    (p) =>
      (p.kind === 'liquid' || p.kind === 'nicsalt') &&
      p.flavourSlug !== null &&
      topSlugs.includes(p.flavourSlug) &&
      stockLevel(p.stock) !== 'out_of_stock',
  ).sort((a, b) => {
    // Exact strength first, then rank by how close it is, then by rating.
    const distA = Math.abs((a.nicotineMg ?? 0) - targetMg);
    const distB = Math.abs((b.nicotineMg ?? 0) - targetMg);
    return distA - distB || b.rating - a.rating;
  });

  // One bottle per flavour keeps the recommendation varied rather than five
  // strengths of the same taste.
  const seen = new Set<string>();
  const liquids = liquidMatches
    .filter((p) => {
      if (seen.has(p.flavourSlug!)) return false;
      seen.add(p.flavourSlug!);
      return true;
    })
    .slice(0, 5);

  // ── Pods for the recommended device ─────────────────────────────────────
  const pods = bestDevice && bestDevice.podFamily !== 'disposable'
    ? PRODUCTS.filter(
        (p) =>
          p.kind === 'pod' &&
          p.podFamilies.includes(bestDevice.podFamily) &&
          stockLevel(p.stock) !== 'out_of_stock',
      )
        .sort((a, b) => {
          // Pick the resistance that suits the chosen nicotine strength.
          const fitA = recommendedNicotineMg(a.coilOhm ?? 1) === targetMg ? 0 : 1;
          const fitB = recommendedNicotineMg(b.coilOhm ?? 1) === targetMg ? 0 : 1;
          return fitA - fitB;
        })
        .slice(0, 2)
    : [];

  const bundleItems = [
    ...(deviceProduct ? [deviceProduct] : []),
    ...pods,
    ...liquids,
  ];
  const subtotalCents = bundleItems.reduce((sum, p) => sum + p.priceCents, 0);
  // Mirrors the Pro tier in lib/bundle.ts.
  const qualifies = Boolean(deviceProduct) && pods.length >= 2 && liquids.length >= 5;
  const discount = qualifies ? 0.15 : pods.length >= 1 && liquids.length >= 3 ? 0.1 : 0;
  const discountedCents = Math.round(subtotalCents * (1 - discount));

  return {
    rationale: profile.rationale,
    nicotineMg: targetMg,
    drawStyle: profile.draw,
    matchedFlavours: topFlavours.map(({ flavour }) => ({
      slug: flavour.slug,
      name: flavour.name,
      why: `${flavour.notes.slice(0, 2).join(' · ')} — Süße ${flavour.sweetness}/10, Kühle ${flavour.coolness}/10`,
    })),
    products: [
      ...(deviceProduct ? [deviceProduct] : []),
      ...pods.slice(0, 1),
      ...liquids.slice(0, 4),
    ].map(toPublic),
    bundle: {
      device: deviceProduct ? toPublic(deviceProduct) : null,
      pods: pods.map(toPublic),
      liquids: liquids.map(toPublic),
      subtotalCents,
      discountedCents,
      savingsCents: subtotalCents - discountedCents,
    },
  };
}
