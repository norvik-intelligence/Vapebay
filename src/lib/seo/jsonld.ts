import type { Product } from '@/lib/types';
import { STOCK_COPY, stockLevel } from '@/lib/utils';

export const SITE = {
  name: 'Vapebay',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vapebay.de',
  legalName: 'Vapebay Handels GmbH',
  description:
    'Pod-Systeme, NicSalts und Einweg-Vapes mit garantierter Kompatibilität. Versand am selben Tag, TPD2-konform, Altersverifikation inklusive.',
} as const;

export const abs = (path: string) => new URL(path, SITE.url).toString();

/** Serializes JSON-LD safely for injection into a <script> tag. */
export function jsonLdScript(data: unknown): string {
  // `</script>` inside a string value would close the tag early; escaping the
  // forward slash is the standard mitigation and keeps the JSON valid.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: abs(crumb.path),
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function productLd(product: Product, path: string, brandName: string) {
  const level = stockLevel(product.stock);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.summary,
    sku: product.id,
    brand: { '@type': 'Brand', name: brandName },
    category: product.categorySlug,
    url: abs(path),
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.toFixed(1),
        reviewCount: product.reviewCount,
        bestRating: '5',
      },
    }),
    offers: {
      '@type': 'Offer',
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: STOCK_COPY[level].schema,
      url: abs(path),
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      seller: { '@type': 'Organization', name: SITE.legalName },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: product.priceCents >= 4900 ? '0.00' : '4.99',
          currency: 'EUR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: ['DE', 'AT'],
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        },
      },
    },
  };
}

/**
 * ItemList is what earns the carousel treatment on category and pSEO pages.
 * Without it a listing page is just text to a crawler.
 */
export function itemListLd(products: Product[], pathFor: (p: Product) => string, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: abs(pathFor(product)),
      name: product.name,
    })),
  };
}

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    areaServed: ['DE', 'AT'],
    // Signals to the crawler that this is an age-restricted storefront, which
    // is what keeps the listings out of the wrong SERP features.
    audience: { '@type': 'Audience', suggestedMinAge: 18 },
    paymentAccepted: 'PayPal, Klarna, Apple Pay, Kreditkarte, SEPA',
    currenciesAccepted: 'EUR',
  };
}
