import { PRODUCTS, productById } from '@/lib/data/catalog';
import { listOrders } from '@/lib/db/orders';
import { routeOrder, type RoutingResult } from './dropshipping';

/**
 * Demo order queue for the admin screens.
 *
 * Deterministic, derived from the real catalog so every line resolves to a real
 * product and the routing engine has something genuine to route. Replace
 * `ADMIN_ORDERS` with a `select from orders` once the DB is seeded — the shape
 * matches `schema.orders` plus its joined lines.
 */

export interface AdminOrderLine {
  productId: string;
  name: string;
  brandSlug: string;
  qty: number;
  unitCents: number;
  unitCostCents: number;
}

export interface AdminOrder {
  id: string;
  placedAt: string;
  customer: { name: string; postcode: string; city: string; country: string };
  email: string;
  status: 'pending' | 'paid' | 'routed' | 'shipped' | 'cancelled';
  paymentMethod: string;
  identReference: string;
  isBusiness: boolean;
  lines: AdminOrderLine[];
}

const CUSTOMERS = [
  { name: 'Jonas Weber', postcode: '10115', city: 'Berlin', country: 'DE' },
  { name: 'Aylin Demir', postcode: '80331', city: 'München', country: 'DE' },
  { name: 'Kiosk Ratzinger e.K.', postcode: '50667', city: 'Köln', country: 'DE' },
  { name: 'Sarah Lindqvist', postcode: '20095', city: 'Hamburg', country: 'DE' },
  { name: 'Markus Hofer', postcode: '1010', city: 'Wien', country: 'AT' },
  { name: 'Shisha Lounge Nord GbR', postcode: '30159', city: 'Hannover', country: 'DE' },
  { name: 'Tobias Krämer', postcode: '70173', city: 'Stuttgart', country: 'DE' },
  { name: 'Elena Petrova', postcode: '04109', city: 'Leipzig', country: 'DE' },
];

const PAYMENTS = ['paypal', 'klarna', 'applepay', 'card', 'sepa'];
const STATUSES: AdminOrder['status'][] = ['paid', 'routed', 'shipped', 'pending', 'routed', 'paid'];

function pickProducts(seed: number, count: number): AdminOrderLine[] {
  const pool = PRODUCTS.filter((p) => p.kind !== 'bundle');
  return Array.from({ length: count }, (_, i) => {
    const product = pool[(seed * 37 + i * 101) % pool.length];
    return {
      productId: product.id,
      name: product.name,
      brandSlug: product.brandSlug,
      qty: ((seed + i) % 3) + 1,
      unitCents: product.priceCents,
      unitCostCents: product.costCents,
    };
  });
}

export const ADMIN_ORDERS: AdminOrder[] = CUSTOMERS.map((customer, index) => {
  const isBusiness = customer.name.includes('Kiosk') || customer.name.includes('GbR');
  const placedAt = new Date(Date.UTC(2026, 6, 26, 9, 0) - index * 5_400_000).toISOString();

  return {
    id: `VB-2026-${(4821 - index * 7).toString(36).toUpperCase().padStart(4, '0')}`,
    placedAt,
    customer,
    email: `${customer.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.de`,
    status: STATUSES[index % STATUSES.length],
    paymentMethod: PAYMENTS[index % PAYMENTS.length],
    identReference: `${index % 2 === 0 ? 'PI' : 'SI'}-${(9_000_000 + index * 137).toString(36).toUpperCase()}`,
    isBusiness,
    lines: pickProducts(index + 1, isBusiness ? 4 : ((index % 3) + 1)),
  };
});

export interface OrderTotals {
  subtotalCents: number;
  costCents: number;
  marginCents: number;
  marginPct: number;
  itemCount: number;
}

export function orderTotals(order: AdminOrder): OrderTotals {
  const subtotalCents = order.lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const costCents = order.lines.reduce((sum, l) => sum + l.unitCostCents * l.qty, 0);
  const marginCents = subtotalCents - costCents;

  return {
    subtotalCents,
    costCents,
    marginCents,
    // Margin on revenue, not on cost — see the note in admin/pricing.ts.
    marginPct: subtotalCents === 0 ? 0 : (marginCents / subtotalCents) * 100,
    itemCount: order.lines.reduce((sum, l) => sum + l.qty, 0),
  };
}

export function orderRouting(order: AdminOrder): RoutingResult {
  return routeOrder(
    order.lines.map((l) => ({ productId: l.productId, brandSlug: l.brandSlug, qty: l.qty })),
  );
}

/**
 * Real orders first, demo orders behind them.
 *
 * The demo rows exist so the admin screens are legible on a fresh install; a
 * dashboard that renders four empty tables teaches a merchant nothing. Once
 * real orders arrive they lead the queue, and `isDemo` lets the UI label the
 * rest honestly rather than passing fixtures off as trade.
 */
export function allOrders(): (AdminOrder & { isDemo: boolean })[] {
  const stored: (AdminOrder & { isDemo: boolean })[] = listOrders().map((order) => ({
    id: order.id,
    placedAt: order.placedAt,
    customer: {
      name: order.customerName,
      postcode: order.postcode,
      city: order.city,
      country: order.country,
    },
    email: order.email,
    status: order.status,
    paymentMethod: order.paymentMethod,
    identReference: order.identReference,
    isBusiness: order.isBusiness,
    lines: order.lines.map((line) => ({
      productId: line.productId,
      name: line.productName,
      // Brand is needed for supplier routing and is not stored on the line —
      // resolve it from the catalog, falling back to the first supplier's
      // coverage rather than dropping the position silently.
      brandSlug: productById(line.productId)?.brandSlug ?? 'unbekannt',
      qty: line.qty,
      unitCents: line.unitCents,
      unitCostCents: line.unitCostCents,
    })),
    isDemo: false,
  }));

  return [...stored, ...ADMIN_ORDERS.map((order) => ({ ...order, isDemo: true }))];
}

export function orderById(id: string) {
  return allOrders().find((order) => order.id === id);
}

/** Aggregate KPIs for the dashboard header. */
export function dashboardKpis() {
  const all = allOrders();
  const totals = all.map(orderTotals);
  const revenue = totals.reduce((sum, t) => sum + t.subtotalCents, 0);
  const margin = totals.reduce((sum, t) => sum + t.marginCents, 0);
  const lowStock = PRODUCTS.filter((p) => p.stock > 0 && p.stock <= 12).length;
  const outOfStock = PRODUCTS.filter((p) => p.stock <= 0).length;

  return {
    revenueCents: revenue,
    marginCents: margin,
    marginPct: revenue === 0 ? 0 : (margin / revenue) * 100,
    orderCount: all.length,
    averageOrderCents: all.length === 0 ? 0 : Math.round(revenue / all.length),
    openOrders: all.filter((o) => o.status === 'paid' || o.status === 'pending').length,
    realOrderCount: all.filter((o) => !o.isDemo).length,
    skuCount: PRODUCTS.length,
    lowStock,
    outOfStock,
  };
}
