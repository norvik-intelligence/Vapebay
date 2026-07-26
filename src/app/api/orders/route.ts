import { NextResponse } from 'next/server';

import { OrderSchema } from '@/lib/validation';
import { productsByIds } from '@/lib/data/catalog';
import { evaluateBundle, shippingFor } from '@/lib/bundle';
import { routeOrder } from '@/lib/admin/dropshipping';
import { persistOrder } from '@/lib/db/orders';

export const runtime = 'nodejs';

/**
 * Order placement.
 *
 * Totals are recomputed here from the catalog — the client posts product ids
 * and quantities only. Trusting a client-sent total is how you end up selling
 * a €39 device for €0.01.
 */
export async function POST(request: Request) {
  const parsed = OrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bestellung unvollständig', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { customer, items, identReference } = parsed.data;

  // Collapse duplicate ids before pricing: a client that posts the same product
  // twice would otherwise be charged twice but only have stock checked once.
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.qty);
  }

  const products = productsByIds([...merged.keys()]);
  if (products.length !== merged.size) {
    return NextResponse.json(
      { error: 'Ein Artikel im Warenkorb ist nicht mehr verfügbar' },
      { status: 409 },
    );
  }

  const lines = [...merged.entries()].map(([productId, qty]) => ({
    product: products.find((p) => p.id === productId)!,
    qty,
  }));

  const evaluation = evaluateBundle(lines);
  const shippingCents = shippingFor(evaluation.totalCents);
  const totalCents = evaluation.totalCents + shippingCents;

  const orderId = `VB-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Blind dropshipping: pick the supplier and generate the packing slip payload
  // straight away, so the admin queue has something actionable on arrival.
  const routing = routeOrder(
    lines.map((l) => ({ productId: l.product.id, brandSlug: l.product.brandSlug, qty: l.qty })),
  );

  const persisted = persistOrder({
    orderId,
    customer,
    identReference,
    lines: lines.map((l) => ({
      productId: l.product.id,
      productName: l.product.name,
      qty: l.qty,
      unitCents: l.product.priceCents,
      // Cost is captured at time of sale — products.cost_cents drifts with
      // every supplier sync, so margin reporting cannot re-read it later.
      unitCostCents: l.product.costCents,
    })),
    subtotalCents: evaluation.subtotalCents,
    discountCents: evaluation.discountCents,
    shippingCents,
    totalCents,
    bundleTier: evaluation.tier?.name ?? null,
    supplierId: routing.assignments[0]?.supplier.id ?? null,
  });

  if (!persisted.ok && persisted.reason === 'out_of_stock') {
    return NextResponse.json(
      { error: 'Nicht genügend Lagerbestand', items: persisted.conflicts },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      orderId,
      status: 'paid',
      identReference,
      paymentMethod: customer.paymentMethod,
      subtotalCents: evaluation.subtotalCents,
      discountCents: evaluation.discountCents,
      bundleTier: evaluation.tier?.name ?? null,
      shippingCents,
      totalCents,
      routing,
      // Surfaced so the caller can tell a durable order from one that only
      // exists in this response — silence here would be the dangerous default.
      persisted: persisted.ok,
      estimatedDelivery: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
    },
    { status: 201 },
  );
}
