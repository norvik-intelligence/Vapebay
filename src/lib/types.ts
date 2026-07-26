/**
 * Domain types for the Vapebay catalog.
 *
 * All money is stored and passed around as integer cents. Floats never touch a
 * price — `19.99 * 3` is `59.97000000000001` and that ends up on an invoice.
 */

export type CategorySlug =
  | 'pod-systeme'
  | 'ersatz-pods-coils'
  | 'nicsalts'
  | 'liquids'
  | 'einweg-vapes'
  | 'b2b-bundles';

export type ProductKind = 'device' | 'pod' | 'coil' | 'liquid' | 'nicsalt' | 'disposable' | 'bundle';

/** Draw style. Determines which liquids actually work in a device. */
export type DrawStyle = 'MTL' | 'RDL' | 'DTL';

export type FlavourProfile = 'fruchtig' | 'suess' | 'eis' | 'minze' | 'tabak' | 'getraenk';

export type StockState = 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock';

export interface Brand {
  slug: string;
  name: string;
  /** Short positioning line — used as the H2 on /marken/[brand]. */
  tagline: string;
  country: string;
  founded: number;
  /** 2–3 letters for the wordmark tile. No logo assets needed. */
  mark: string;
  description: string;
  categories: CategorySlug[];
}

export interface Category {
  slug: CategorySlug;
  name: string;
  short: string;
  description: string;
  /** lucide-react icon name, resolved through the icon map in the UI layer. */
  icon: string;
}

export interface Device {
  slug: string;
  name: string;
  brandSlug: string;
  /**
   * The compatibility primitive. Two products fit each other when they share a
   * podFamily — this is what makes the finder engine a lookup instead of a
   * hand-maintained matrix of N×M pairs.
   */
  podFamily: string;
  drawStyle: DrawStyle;
  /** Resistances the device actually accepts, in ohms. */
  coilOhms: number[];
  wattageRange: [number, number];
  batteryMah: number;
  podCapacityMl: number;
  refillable: boolean;
  releaseYear: number;
  /** Ideal PG/VG for this device, as VG percentage. 50 = 50/50. */
  idealVg: number;
  /** Acceptable VG window — outside this the coil floods or burns. */
  vgRange: [number, number];
  maxNicotineMg: number;
  popularity: number;
  summary: string;
}

export interface Flavour {
  slug: string;
  name: string;
  profiles: FlavourProfile[];
  /** Tasting notes, top to base. */
  notes: string[];
  /** 0–10, drives the "Süße" meter in the UI. */
  sweetness: number;
  coolness: number;
  description: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  kind: ProductKind;
  brandSlug: string;
  categorySlug: CategorySlug;
  /** Cents. Gross, incl. 19% USt. */
  priceCents: number;
  /** Cents. Strikethrough reference price; null when not on offer. */
  compareAtCents: number | null;
  /** Cents. Wholesale cost — admin-only, never serialized to the storefront. */
  costCents: number;
  stock: number;
  rating: number;
  reviewCount: number;
  /** Empty for devices; populated for liquids and nicsalts. */
  flavourSlug: string | null;
  nicotineMg: number | null;
  /** VG percentage. 50 = 50/50 PG/VG. */
  vg: number | null;
  volumeMl: number | null;
  /** Coil resistance in ohms — pods and coils only. */
  coilOhm: number | null;
  /** Which device families this product fits. Empty = universal (liquids). */
  podFamilies: string[];
  /** Device slug, for products that ARE a device. */
  deviceSlug: string | null;
  puffs: number | null;
  packSize: number;
  b2bMinQty: number | null;
  b2bUnitCents: number | null;
  tags: string[];
  summary: string;
  /** Deterministic gradient seed so cards look distinct without image assets. */
  hue: number;
}

export interface CartLine {
  productId: string;
  qty: number;
}

export interface BundleSlot {
  kind: ProductKind;
  label: string;
  required: number;
  productIds: string[];
}
