import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Vapebay schema.
 *
 * Money is `integer` cents everywhere. SQLite has no decimal type and REAL
 * would silently round 19.99 — on an order line that becomes a cent of drift
 * per item and an accounting reconciliation nobody wants to do.
 */

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
};

export const brands = sqliteTable('brands', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  country: text('country').notNull(),
  founded: integer('founded').notNull(),
  mark: text('mark').notNull(),
  description: text('description').notNull(),
  ...timestamps,
});

export const devices = sqliteTable(
  'devices',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    brandSlug: text('brand_slug')
      .notNull()
      .references(() => brands.slug),
    /** The compatibility join key. */
    podFamily: text('pod_family').notNull(),
    drawStyle: text('draw_style', { enum: ['MTL', 'RDL', 'DTL'] }).notNull(),
    /** JSON array of accepted resistances. */
    coilOhms: text('coil_ohms', { mode: 'json' }).$type<number[]>().notNull(),
    wattMin: integer('watt_min').notNull(),
    wattMax: integer('watt_max').notNull(),
    batteryMah: integer('battery_mah').notNull(),
    podCapacityMl: real('pod_capacity_ml').notNull(),
    refillable: integer('refillable', { mode: 'boolean' }).notNull(),
    releaseYear: integer('release_year').notNull(),
    idealVg: integer('ideal_vg').notNull(),
    vgMin: integer('vg_min').notNull(),
    vgMax: integer('vg_max').notNull(),
    maxNicotineMg: integer('max_nicotine_mg').notNull(),
    popularity: integer('popularity').notNull(),
    summary: text('summary').notNull(),
    ...timestamps,
  },
  (table) => ({
    podFamilyIdx: index('devices_pod_family_idx').on(table.podFamily),
    brandIdx: index('devices_brand_idx').on(table.brandSlug),
  }),
);

export const flavours = sqliteTable('flavours', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  profiles: text('profiles', { mode: 'json' }).$type<string[]>().notNull(),
  notes: text('notes', { mode: 'json' }).$type<string[]>().notNull(),
  sweetness: integer('sweetness').notNull(),
  coolness: integer('coolness').notNull(),
  description: text('description').notNull(),
  ...timestamps,
});

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    kind: text('kind', {
      enum: ['device', 'pod', 'coil', 'liquid', 'nicsalt', 'disposable', 'bundle'],
    }).notNull(),
    brandSlug: text('brand_slug')
      .notNull()
      .references(() => brands.slug),
    categorySlug: text('category_slug').notNull(),
    priceCents: integer('price_cents').notNull(),
    compareAtCents: integer('compare_at_cents'),
    /** Wholesale cost. Never selected in storefront queries. */
    costCents: integer('cost_cents').notNull(),
    stock: integer('stock').notNull().default(0),
    rating: real('rating').notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),
    flavourSlug: text('flavour_slug').references(() => flavours.slug),
    nicotineMg: integer('nicotine_mg'),
    vg: integer('vg'),
    volumeMl: real('volume_ml'),
    coilOhm: real('coil_ohm'),
    podFamilies: text('pod_families', { mode: 'json' }).$type<string[]>().notNull(),
    deviceSlug: text('device_slug'),
    puffs: integer('puffs'),
    packSize: integer('pack_size').notNull().default(1),
    b2bMinQty: integer('b2b_min_qty'),
    b2bUnitCents: integer('b2b_unit_cents'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
    summary: text('summary').notNull(),
    hue: integer('hue').notNull().default(180),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
    categoryIdx: index('products_category_idx').on(table.categorySlug),
    brandIdx: index('products_brand_idx').on(table.brandSlug),
    flavourIdx: index('products_flavour_idx').on(table.flavourSlug),
    kindIdx: index('products_kind_idx').on(table.kind),
  }),
);

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    street: text('street').notNull(),
    postcode: text('postcode').notNull(),
    city: text('city').notNull(),
    country: text('country').notNull(),
    paymentMethod: text('payment_method').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull().default(0),
    shippingCents: integer('shipping_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    bundleTier: text('bundle_tier'),
    /** Links to the compliance record that authorised this sale. */
    identReference: text('ident_reference').notNull(),
    status: text('status', {
      enum: ['pending', 'paid', 'routed', 'shipped', 'cancelled'],
    })
      .notNull()
      .default('pending'),
    /** Supplier the order was routed to for blind dropshipping. */
    supplierId: text('supplier_id'),
    isBusiness: integer('is_business', { mode: 'boolean' }).notNull().default(false),
    vatId: text('vat_id'),
    ...timestamps,
  },
  (table) => ({
    statusIdx: index('orders_status_idx').on(table.status),
    emailIdx: index('orders_email_idx').on(table.email),
  }),
);

export const orderLines = sqliteTable(
  'order_lines',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    productName: text('product_name').notNull(),
    qty: integer('qty').notNull(),
    /** Price at time of sale — products.price_cents will drift. */
    unitCents: integer('unit_cents').notNull(),
    unitCostCents: integer('unit_cost_cents').notNull(),
  },
  (table) => ({
    orderIdx: index('order_lines_order_idx').on(table.orderId),
  }),
);

export const ageVerifications = sqliteTable(
  'age_verifications',
  {
    reference: text('reference').primaryKey(),
    provider: text('provider', { enum: ['postident', 'sofort'] }).notNull(),
    status: text('status', { enum: ['verified', 'rejected', 'pending'] }).notNull(),
    lastName: text('last_name').notNull(),
    /** Retained for the statutory audit trail, not for marketing. */
    birthDate: text('birth_date').notNull(),
    checkedAt: text('checked_at').notNull(),
    ...timestamps,
  },
  (table) => ({
    statusIdx: index('age_verifications_status_idx').on(table.status),
    checkedIdx: index('age_verifications_checked_idx').on(table.checkedAt),
  }),
);

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** 'sftp' | 'rest' — how the stock feed is pulled. */
  transport: text('transport', { enum: ['sftp', 'rest'] }).notNull(),
  endpoint: text('endpoint').notNull(),
  /** Cron expression for the sync scheduler. */
  schedule: text('schedule').notNull(),
  lastSyncAt: text('last_sync_at'),
  lastSyncStatus: text('last_sync_status', { enum: ['ok', 'partial', 'failed', 'never'] })
    .notNull()
    .default('never'),
  itemsTracked: integer('items_tracked').notNull().default(0),
  supportsBlindDropship: integer('supports_blind_dropship', { mode: 'boolean' })
    .notNull()
    .default(false),
  leadTimeDays: integer('lead_time_days').notNull().default(2),
  ...timestamps,
});

export const markupRules = sqliteTable('markup_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Matches products.kind. */
  productKind: text('product_kind').notNull(),
  /** Basis points: 2000 = +20%. Integers avoid float drift on price math. */
  markupBps: integer('markup_bps').notNull(),
  /** Never sell below this, even if the markup would allow it. */
  floorCents: integer('floor_cents').notNull().default(0),
  /** Round the result to .49/.99 charm prices. */
  charmPricing: integer('charm_pricing', { mode: 'boolean' }).notNull().default(true),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const pseoTemplates = sqliteTable('pseo_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pattern: text('pattern').notNull(),
  intent: text('intent').notNull(),
  enrichmentPrompt: text('enrichment_prompt').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastGeneratedAt: text('last_generated_at'),
  routeCount: integer('route_count').notNull().default(0),
  ...timestamps,
});

export type Brand = typeof brands.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderLine = typeof orderLines.$inferSelect;
export type AgeVerification = typeof ageVerifications.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type MarkupRule = typeof markupRules.$inferSelect;
export type PseoTemplateRow = typeof pseoTemplates.$inferSelect;
