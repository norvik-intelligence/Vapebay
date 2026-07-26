import { NextResponse } from 'next/server';

import { OrderSchema } from '@/lib/validation';
import { productsByIds } from '@/lib/data/catalog';
import { evaluateBundle, shippingFor } from '@/lib/bundle';
import { routeOrder } from '@/lib/admin/dropshipping';

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

  const products = productsByIds(items.map((i) => i.productId));
  if (products.length !== items.length) {
    return NextResponse.json(
      { error: 'Ein Artikel im Warenkorb ist nicht mehr verfügbar' },
      { status: 409 },
    );
  }

  const lines = items.map((item) => ({
    product: products.find((p) => p.id === item.productId)!,
    qty: item.qty,
  }));

  const outOfStock = lines.filter((line) => line.product.stock < line.qty);
  if (outOfStock.length > 0) {
    return NextResponse.json(
      {
        error: 'Nicht genügend Lagerbestand',
        items: outOfStock.map((l) => ({ id: l.product.id, available: l.product.stock })),
      },
      { status: 409 },
    );
  }

  const evaluation = evaluateBundle(lines);
  const shippingCents = shippingFor(evaluation.totalCents);
  const totalCents = evaluation.totalCents + shippingCents;

  const orderId = `VB-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Blind dropshipping: pick the supplier and generate the packing slip payload
  // straight away, so the admin queue has something actionable on arrival.
  const routing = routeOrder(
    lines.map((l) => ({ productId: l.product.id, brandSlug: l.product.brandSlug, qty: l.qty })),
  );

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
      estimatedDelivery: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
    },
    { status: 201 },
  );
}
