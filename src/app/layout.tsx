import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { AgeGate } from '@/components/site/age-gate';
import { PreviewBanner } from '@/components/site/preview-banner';
import { CartDrawer } from '@/components/commerce/cart-drawer';
import { SITE, jsonLdScript, organizationLd } from '@/lib/seo/jsonld';
import { isIndexable, isPreview } from '@/lib/env';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Mono carries all technical metadata: ohms, mg/ml, PG/VG, SKUs, prices in
// tables. It is the "spec sheet" voice of the brand and the one personality
// element that stops this reading as a generic dark storefront.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Vapebay — Pod-Systeme, NicSalts & Einweg-Vapes mit Kompatibilitätsgarantie',
    template: '%s | Vapebay',
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName }],
  keywords: [
    'Vape Shop',
    'Pod System',
    'NicSalt',
    'Einweg Vape',
    'Liquid kaufen',
    'Elfbar',
    'RandM Tornado',
    'Lost Mary',
  ],
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: SITE.name,
    title: 'Vapebay — Kompatibilität garantiert, Versand am selben Tag',
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image' },
  // Preview-Deployments tragen zusätzlich ein Meta-Robots-noindex, nicht nur
  // das robots.txt-Disallow: eine Preview-URL, die jemand direkt verlinkt,
  // kann trotz Disallow im Index landen — nur noindex verhindert das.
  robots: isIndexable()
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
      }
    : { index: false, follow: false, nocache: true },
  alternates: { canonical: '/' },
  // Legally required signal for age-restricted retail in DE.
  other: { rating: 'adult' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08090b' },
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationLd()) }}
        />
        <Providers>
          {/* Skip link: first tab stop on every page, per WCAG 2.4.1. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg"
          >
            Zum Inhalt springen
          </a>
          {isPreview() && <PreviewBanner />}
          <SiteHeader />
          <main id="main" className="min-h-[60dvh]">
            {children}
          </main>
          <SiteFooter />
          <CartDrawer />
          <AgeGate />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'glass-strong !rounded-md !text-fg !border-line',
                description: '!text-fg-muted',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
