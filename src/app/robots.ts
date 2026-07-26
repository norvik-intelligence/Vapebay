import type { MetadataRoute } from 'next';

import { abs } from '@/lib/seo/jsonld';
import { isIndexable } from '@/lib/env';

/**
 * Pro Request ausgewertet statt zur Buildzeit eingebacken.
 *
 * Das Meta-Robots-Tag im Layout landet zwangsläufig im statischen HTML — es
 * hängt daran, dass `VERCEL_ENV` schon beim Build gesetzt ist (auf Vercel ist
 * es das). robots.txt ist die wichtigste Sperre gegen indexierte Previews und
 * deshalb bewusst unabhängig davon: selbst wenn ein Artefakt aus einer anderen
 * Umgebung deployt würde, greift sie korrekt.
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  // Preview-Deployments werden vollständig gesperrt. Sie tragen denselben
  // Inhalt wie die Produktion auf einer anderen Domain — indexiert wären sie
  // Duplicate Content gegen die eigene Seite.
  if (!isIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin und Checkout haben keinen Ranking-Wert und würden Zustand in
        // den Index tragen. `/api/` ist gesperrt, damit Crawler nicht den
        // Empfehlungs-Endpunkt für einen Cache abklopfen, den niemand liest.
        disallow: ['/admin', '/admin/', '/checkout', '/api/'],
      },
    ],
    sitemap: abs('/sitemap.xml'),
    host: abs('/'),
  };
}
