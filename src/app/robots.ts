import type { MetadataRoute } from 'next';
import { abs } from '@/lib/seo/jsonld';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin and checkout carry no ranking value and leak state into the
        // index. `/api/` is disallowed so crawlers don't hammer the
        // recommendation endpoint building a cache nobody reads.
        disallow: ['/admin', '/admin/', '/checkout', '/api/'],
      },
    ],
    sitemap: abs('/sitemap.xml'),
    host: abs('/'),
  };
}
