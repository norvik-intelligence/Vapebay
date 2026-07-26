import { NextResponse } from 'next/server';
import { z } from 'zod';

import { simulateSync } from '@/lib/admin/suppliers';

export const runtime = 'nodejs';

const BodySchema = z.object({ supplierId: z.string().min(1) });

/**
 * Triggers a supplier stock/price sync.
 *
 * Production shape: enqueue a job and return 202 with a job id, because an
 * SFTP pull of 2000 rows exceeds any sensible request timeout. The simulator
 * returns the finished result directly so the UI flow can be built and tested
 * against the same response body.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'supplierId fehlt' }, { status: 422 });
  }

  const result = simulateSync(parsed.data.supplierId);

  return NextResponse.json(result, {
    status: result.status === 'failed' ? 502 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
