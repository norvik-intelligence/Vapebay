import type { Product, ProductKind } from '@/lib/types';

/**
 * Bundle rules (AOV booster).
 *
 * Two tiers rather than one: a single all-or-nothing 15% rule leaves everyone
 * who assembles 4 of the 8 required items with zero feedback and no reason to
 * continue. The Starter tier gives an early win and a visible next step.
 */

export interface BundleRequirement {
  kinds: ProductKind[];
  label: string;
  hint: string;
  qty: number;
}

export interface BundleTier {
  id: 'starter' | 'pro';
  name: string;
  discount: number;
  requirements: BundleRequirement[];
  pitch: string;
}

export const BUNDLE_TIERS: BundleTier[] = [
  {
    id: 'starter',
    name: 'Starter-Set',
    discount: 0.1,
    pitch: 'Gerät, Ersatzpod und drei Liquids — alles, was für den Start nötig ist.',
    requirements: [
      { kinds: ['device'], label: 'Pod-System', hint: 'Dein Akkuträger', qty: 1 },
      { kinds: ['pod', 'coil'], label: 'Pod-Pack', hint: 'Verschleißteil, hält ca. 2 Wochen', qty: 1 },
      { kinds: ['liquid', 'nicsalt'], label: 'Liquids', hint: '10 ml je Flasche', qty: 3 },
    ],
  },
  {
    id: 'pro',
    name: 'Pro-Set',
    discount: 0.15,
    pitch: 'Der Monatsvorrat: doppelte Pods, fünf Liquids, 15 % Rabatt auf alles.',
    requirements: [
      { kinds: ['device'], label: 'Pod-System', hint: 'Dein Akkuträger', qty: 1 },
      { kinds: ['pod', 'coil'], label: 'Pod-Packs', hint: 'Reicht für rund 4 Wochen', qty: 2 },
      { kinds: ['liquid', 'nicsalt'], label: 'Liquids', hint: '50 ml Gesamtmenge', qty: 5 },
    ],
  },
];

export interface RequirementProgress extends BundleRequirement {
  have: number;
  met: boolean;
}

export interface BundleEvaluation {
  tier: BundleTier | null;
  nextTier: BundleTier | null;
  /** Progress toward `nextTier`, or toward `tier` when already maxed out. */
  progress: RequirementProgress[];
  /** 0–1, for the progress bar. */
  completion: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  /** Plain-language description of what to add next. Null when maxed. */
  nextStep: string | null;
}

/**
 * Only the two fields the rules actually need. Typing this structurally rather
 * than as `Product` lets the cart drawer pass `PublicProduct` (cost stripped)
 * through the same evaluator the server uses.
 */
export interface BundleLine {
  product: Pick<Product, 'kind' | 'priceCents'>;
  qty: number;
}

type Line = BundleLine;

function countFor(lines: Line[], kinds: ProductKind[]): number {
  return lines
    .filter((line) => kinds.includes(line.product.kind))
    .reduce((sum, line) => sum + line.qty, 0);
}

function tierMet(lines: Line[], tier: BundleTier): boolean {
  return tier.requirements.every((req) => countFor(lines, req.kinds) >= req.qty);
}

function progressFor(lines: Line[], tier: BundleTier): RequirementProgress[] {
  return tier.requirements.map((req) => {
    const have = countFor(lines, req.kinds);
    return { ...req, have, met: have >= req.qty };
  });
}

export function evaluateBundle(lines: Line[]): BundleEvaluation {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.product.priceCents * line.qty,
    0,
  );

  // Highest tier wins — evaluate from the richest downward.
  const achieved = [...BUNDLE_TIERS].reverse().find((tier) => tierMet(lines, tier)) ?? null;
  const nextTier =
    BUNDLE_TIERS.find(
      (tier) => !achieved || tier.discount > achieved.discount,
    ) ?? null;

  const target = nextTier ?? achieved ?? BUNDLE_TIERS[0];
  const progress = progressFor(lines, target);

  const completion =
    progress.reduce((sum, req) => sum + Math.min(req.have / req.qty, 1), 0) / progress.length;

  const discount = achieved?.discount ?? 0;
  const discountCents = Math.round(subtotalCents * discount);

  const missing = progress.filter((req) => !req.met);
  const nextStep =
    nextTier && missing.length > 0
      ? missing
          .map((req) => `${req.qty - req.have}× ${req.label}`)
          .join(' und ') + ` fehlen für ${formatDiscount(nextTier.discount)} Rabatt`
      : null;

  return {
    tier: achieved,
    nextTier: achieved && nextTier && nextTier.discount <= achieved.discount ? null : nextTier,
    progress,
    completion,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    nextStep,
  };
}

const formatDiscount = (ratio: number) => `${Math.round(ratio * 100)} %`;

/** Free shipping threshold in cents. Surfaced in the cart as a nudge. */
export const FREE_SHIPPING_CENTS = 4900;
export const SHIPPING_CENTS = 499;

export function shippingFor(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_CENTS;
}
