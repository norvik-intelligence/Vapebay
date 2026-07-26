import { NextResponse } from 'next/server';
import { z } from 'zod';

import { productsByIds, publicProducts } from '@/lib/data/catalog';

export const runtime = 'nodejs';

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).max(100),
});

/**
 * Hydrates cart lines. The cart stores ids only — prices and stock must be
 * re-read from the server on every render, or a visitor who left a tab open for
 * a week would check out at last week's price.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Produkt-IDs' }, { status: 422 });
  }

  return NextResponse.json({ products: publicProducts(productsByIds(parsed.data.ids)) });
}
