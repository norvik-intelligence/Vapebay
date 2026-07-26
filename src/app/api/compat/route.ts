import { NextResponse } from 'next/server';

import { compatibilityFor } from '@/lib/compat';
import { toPublic } from '@/lib/data/catalog';
import { parseCoilSegment } from '@/lib/data/devices';

export const runtime = 'nodejs';

/**
 * Powers the interactive compatibility finder. The same `compatibilityFor()`
 * call backs the statically-generated /kompatibel pages, so the widget and the
 * SEO page can never disagree about what fits.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceSlug = searchParams.get('device');
  const ohmParam = searchParams.get('ohm');

  if (!deviceSlug) {
    return NextResponse.json({ error: 'Parameter "device" fehlt' }, { status: 400 });
  }

  // Accept both "0.6" and the URL segment form "0-6-ohm-pod".
  const ohm =
    ohmParam === null || ohmParam === ''
      ? undefined
      : (Number.isFinite(Number(ohmParam)) ? Number(ohmParam) : parseCoilSegment(ohmParam)) ??
        undefined;

  const report = compatibilityFor(deviceSlug, ohm);
  if (!report) {
    return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json(
    {
      device: report.device,
      ohm: report.ohm,
      recommendedMg: report.recommendedMg,
      upgradePath: report.upgradePath,
      pods: report.pods.map(toPublic),
      liquids: report.perfectLiquids.slice(0, 8).map((fit) => ({
        product: toPublic(fit.product),
        level: fit.level,
        reason: fit.reason,
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
  );
}
