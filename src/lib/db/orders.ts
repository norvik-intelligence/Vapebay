import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';

import { getDb } from './index';
import { orderLines, orders, products } from './schema';
import type { CheckoutValues } from '@/lib/validation';

/**
 * Order persistence.
 *
 * Everything below runs inside one transaction: the order header, its lines and
 * the stock decrements. A partial write here means either a paid order nobody
 * can fulfil, or stock reserved for an order that never existed — both are
 * worse than the request failing outright.
 *
 * As with the compliance log, a missing database degrades to a clear failure
 * rather than a crash, and the caller is told whether the write landed.
 */

export interface PersistOrderInput {
  orderId: string;
  customer: CheckoutValues;
  identReference: string;
  lines: {
    productId: string;
    productName: string;
    qty: number;
    unitCents: number;
    unitCostCents: number;
  }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  bundleTier: string | null;
  supplierId: string | null;
}

export type PersistResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: 'out_of_stock'; conflicts: { productId: string; available: number }[] }
  | { ok: false; reason: 'unavailable'; message: string };

export function persistOrder(input: PersistOrderInput): PersistResult {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch (error) {
    return {
      ok: false,
      reason: 'unavailable',
      message: error instanceof Error ? error.message : 'Datenbank nicht erreichbar',
    };
  }

  try {
    return db.transaction((tx): PersistResult => {
      // Re-read stock inside the transaction. Checking before BEGIN would let
      // two concurrent checkouts both see the last unit as available.
      const conflicts: { productId: string; available: number }[] = [];
      for (const line of input.lines) {
        const row = tx
          .select({ stock: products.stock })
          .from(products)
          .where(eq(products.id, line.productId))
          .get();

        // A product missing from the DB means the catalog was seeded from a
        // different revision than the one serving requests — treat it as
        // unavailable rather than silently selling something unknown.
        if (!row || row.stock < line.qty) {
          conflicts.push({ productId: line.productId, available: row?.stock ?? 0 });
        }
      }

      if (conflicts.length > 0) {
        // Roll back so the stock decrements above never partially apply.
        tx.rollback();
      }

      tx.insert(orders)
        .values({
          id: input.orderId,
          email: input.customer.email,
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          street: input.customer.street,
          postcode: input.customer.postcode,
          city: input.customer.city,
          country: input.customer.country,
          paymentMethod: input.customer.paymentMethod,
          subtotalCents: input.subtotalCents,
          discountCents: input.discountCents,
          shippingCents: input.shippingCents,
          totalCents: input.totalCents,
          bundleTier: input.bundleTier,
          identReference: input.identReference,
          status: 'paid',
          supplierId: input.supplierId,
          isBusiness: input.customer.isBusiness,
          vatId: input.customer.vatId ?? null,
        })
        .run();

      for (const line of input.lines) {
        tx.insert(orderLines)
          .values({
            orderId: input.orderId,
            productId: line.productId,
            productName: line.productName,
            qty: line.qty,
            unitCents: line.unitCents,
            unitCostCents: line.unitCostCents,
          })
          .run();

        // Decrement in SQL rather than read-modify-write in JS, so the value
        // is derived from the row as it exists at write time.
        tx.update(products)
          .set({ stock: sql`${products.stock} - ${line.qty}` })
          .where(eq(products.id, line.productId))
          .run();
      }

      return { ok: true, orderId: input.orderId };
    });
  } catch (error) {
    // drizzle's tx.rollback() throws to unwind; distinguish it from a real fault.
    const conflicts = collectConflicts(db, input.lines);
    if (conflicts.length > 0) return { ok: false, reason: 'out_of_stock', conflicts };
    return {
      ok: false,
      reason: 'unavailable',
      message: error instanceof Error ? error.message : 'Bestellung konnte nicht gespeichert werden',
    };
  }
}

function collectConflicts(
  db: ReturnType<typeof getDb>,
  lines: PersistOrderInput['lines'],
): { productId: string; available: number }[] {
  try {
    return lines
      .map((line) => {
        const row = db
          .select({ stock: products.stock })
          .from(products)
          .where(eq(products.id, line.productId))
          .get();
        return { productId: line.productId, available: row?.stock ?? 0, needed: line.qty };
      })
      .filter((entry) => entry.available < entry.needed)
      .map(({ productId, available }) => ({ productId, available }));
  } catch {
    return [];
  }
}

export interface StoredOrder {
  id: string;
  placedAt: string;
  email: string;
  customerName: string;
  postcode: string;
  city: string;
  country: string;
  status: 'pending' | 'paid' | 'routed' | 'shipped' | 'cancelled';
  paymentMethod: string;
  identReference: string;
  isBusiness: boolean;
  subtotalCents: number;
  totalCents: number;
  lines: {
    productId: string;
    productName: string;
    qty: number;
    unitCents: number;
    unitCostCents: number;
  }[];
}

/** Reads real orders for the admin queue. Returns [] when no DB is reachable. */
export function listOrders(limit = 25): StoredOrder[] {
  try {
    const db = getDb();
    const rows = db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).all();

    return rows.map((row) => ({
      id: row.id,
      placedAt: row.createdAt,
      email: row.email,
      customerName: `${row.firstName} ${row.lastName}`,
      postcode: row.postcode,
      city: row.city,
      country: row.country,
      status: row.status,
      paymentMethod: row.paymentMethod,
      identReference: row.identReference,
      isBusiness: row.isBusiness,
      subtotalCents: row.subtotalCents,
      totalCents: row.totalCents,
      lines: db
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, row.id))
        .all()
        .map((line) => ({
          productId: line.productId,
          productName: line.productName,
          qty: line.qty,
          unitCents: line.unitCents,
          unitCostCents: line.unitCostCents,
        })),
    }));
  } catch {
    return [];
  }
}
