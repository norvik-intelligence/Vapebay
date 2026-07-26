import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Lock } from 'lucide-react';

import { BRANDS, CATEGORIES } from '@/lib/data/brands';
import { FLAVOURS } from '@/lib/data/flavours';

const TRUST = [
  { icon: ShieldCheck, title: 'Altersverifikation', body: 'PostIdent & SOFORT Ident nach JuSchG §10' },
  { icon: Truck, title: 'Versand heute', body: 'Bestellungen bis 15 Uhr, DHL & DPD' },
  { icon: RotateCcw, title: '14 Tage Rückgabe', body: 'Ungeöffnete Ware, ohne Angabe von Gründen' },
  { icon: Lock, title: 'Sichere Zahlung', body: 'PayPal, Klarna, Apple Pay, SEPA' },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-bg-subtle/40">
      <div className="container py-12">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="hairline my-10" />

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <nav aria-labelledby="footer-cat">
            <h2 id="footer-cat" className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">
              Kategorien
            </h2>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/produkte/${category.slug}`}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-brands">
            <h2 id="footer-brands" className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">
              Marken
            </h2>
            <ul className="mt-4 space-y-2.5">
              {BRANDS.map((brand) => (
                <li key={brand.slug}>
                  <Link
                    href={`/marken/${brand.slug}`}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-flavours">
            <h2 id="footer-flavours" className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">
              Beliebte Geschmäcker
            </h2>
            <ul className="mt-4 space-y-2.5">
              {FLAVOURS.slice(0, 8).map((flavour) => (
                <li key={flavour.slug}>
                  <Link
                    href={`/geschmack/${flavour.slug}`}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {flavour.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">Service</h2>
            <ul className="mt-4 space-y-2.5">
              {[
                ['/b2b', 'B2B & Grosshandel'],
                ['/kompatibel', 'Kompatibilitäts-Finder'],
                ['/bundle', 'Bundle Builder'],
                ['/admin', 'Admin-Dashboard'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-fg-muted transition-colors hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col gap-6 text-xs leading-relaxed text-fg-subtle lg:flex-row lg:items-start lg:justify-between">
          <p className="measure">
            <strong className="font-medium text-fg-muted">Warnhinweis nach §12 TabakerzG:</strong>{' '}
            Dieses Produkt enthält Nikotin. Nikotin macht sehr schnell abhängig. Nicht für
            Nichtraucher, Jugendliche unter 18 Jahren, Schwangere und Stillende geeignet. Der Verkauf
            an Minderjährige ist gesetzlich untersagt.
          </p>
          <p className="shrink-0 font-mono">© {new Date().getFullYear()} Vapebay Handels GmbH</p>
        </div>
      </div>
    </footer>
  );
}
