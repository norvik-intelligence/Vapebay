'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, ShieldCheck, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { CATEGORIES } from '@/lib/data/brands';
import { useCart } from '@/lib/store/cart';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TasteFinderTrigger } from '@/components/commerce/taste-finder';

const NAV = [
  { href: '/produkte/pod-systeme', label: 'Pod-Systeme' },
  { href: '/produkte/einweg-vapes', label: 'Einweg-Vapes' },
  { href: '/produkte/nicsalts', label: 'NicSalts' },
  { href: '/kompatibel', label: 'Kompatibilität' },
  { href: '/b2b', label: 'B2B' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const openCart = useCart((s) => s.open);
  const items = useCart((s) => s.items);

  // Cart count must not render on the server: the store hydrates from
  // localStorage, and a mismatch would flash "0" over a real count.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      {/* Trust bar. Ships above the logo because "versandkostenfrei" and
          "Altersprüfung" are the two objections that kill the first session. */}
      <div className="border-b border-line bg-bg-subtle/60">
        <div className="container flex h-9 items-center justify-between gap-4 text-2xs text-fg-subtle">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-accent" aria-hidden />
            <span>Altersverifikation nach JuSchG · TPD2-konform</span>
          </p>
          <p className="hidden sm:block">Versandkostenfrei ab 49 € · Bestellungen bis 15 Uhr gehen heute raus</p>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-40 transition-shadow duration-200',
          scrolled ? 'glass-strong shadow-card' : 'border-b border-line bg-bg',
        )}
      >
        <div className="container flex h-16 items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-sm focus-visible:ring-offset-4"
            aria-label="Vapebay Startseite"
          >
            <span className="relative grid size-8 place-items-center rounded-sm bg-accent text-accent-fg">
              <span className="font-mono text-sm font-medium">V</span>
              <span className="absolute inset-0 animate-vapour-float rounded-sm bg-accent/40 blur-md" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">Vapebay</span>
          </Link>

          <nav aria-label="Hauptnavigation" className="ml-4 hidden lg:flex lg:items-center lg:gap-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'text-accent' : 'text-fg-muted hover:text-fg',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <TasteFinderTrigger />

            <Link
              href="/produkte"
              className="grid size-10 place-items-center rounded-md text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
              aria-label="Alle Produkte durchsuchen"
            >
              <Search className="size-4" />
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={openCart}
              className="relative"
              aria-label={mounted && count > 0 ? `Warenkorb, ${count} Artikel` : 'Warenkorb'}
            >
              <ShoppingBag className="size-4" />
              {mounted && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 font-mono text-2xs font-medium text-accent-fg">
                  {count}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Menü schließen' : 'Menü öffnen'}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              id="mobile-nav"
              aria-label="Mobile Navigation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-line lg:hidden"
            >
              <div className="container flex flex-col gap-1 py-4">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-sm px-3 py-3 text-base font-medium text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="hairline my-2" />
                {CATEGORIES.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/produkte/${category.slug}`}
                    className="rounded-sm px-3 py-2.5 text-sm text-fg-subtle transition-colors hover:text-fg"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
