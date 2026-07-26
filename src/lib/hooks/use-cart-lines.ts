'use client';

import { useQuery } from '@tanstack/react-query';

import type { PublicProduct } from '@/lib/data/catalog';
import { useCart } from '@/lib/store/cart';
import { evaluateBundle, shippingFor, type BundleEvaluation } from '@/lib/bundle';

export interface HydratedLine {
  product: PublicProduct;
  qty: number;
  lineTotalCents: number;
}

export interface CartSummary {
  lines: HydratedLine[];
  bundle: BundleEvaluation;
  shippingCents: number;
  grandTotalCents: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Single source of truth for "what is in the cart, and what does it cost".
 * The drawer, the checkout and the bundle builder all read this, so a pricing
 * rule can never be implemented three slightly different ways.
 */
export function useCartLines(): CartSummary {
  const items = useCart((s) => s.items);
  const ids = items.map((i) => i.productId);
  const key = [...ids].sort().join(',');

  const query = useQuery({
    queryKey: ['cart-products', key],
    enabled: ids.length > 0,
    queryFn: async (): Promise<PublicProduct[]> => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Warenkorb konnte nicht geladen werden');
      const data = (await res.json()) as { products: PublicProduct[] };
      return data.products;
    },
  });

  const byId = new Map((query.data ?? []).map((p) => [p.id, p]));

  const lines: HydratedLine[] = items
    .map((item) => {
      const product = byId.get(item.productId);
      if (!product) return null;
      return {
        product,
        qty: item.qty,
        lineTotalCents: product.priceCents * item.qty,
      };
    })
    .filter((line): line is HydratedLine => line !== null);

  const bundle = evaluateBundle(lines.map((l) => ({ product: l.product, qty: l.qty })));
  const shippingCents = shippingFor(bundle.totalCents);

  return {
    lines,
    bundle,
    shippingCents,
    grandTotalCents: bundle.totalCents + shippingCents,
    isLoading: query.isLoading && ids.length > 0,
    isError: query.isError,
  };
}
