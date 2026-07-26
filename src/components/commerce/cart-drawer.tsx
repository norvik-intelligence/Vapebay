'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X, Truck } from 'lucide-react';

import { useCart } from '@/lib/store/cart';
import { useCartLines } from '@/lib/hooks/use-cart-lines';
import { FREE_SHIPPING_CENTS } from '@/lib/bundle';
import { cn, formatEur } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { ProductVisual } from './product-visual';
import { BundleProgress } from './bundle-progress';

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { lines, bundle, shippingCents, grandTotalCents, isLoading } = useCartLines();

  const panelRef = React.useRef<HTMLDivElement>(null);

  // Lock the background scroll while the drawer owns the viewport.
  React.useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    // Move focus into the panel so the next Tab lands inside the drawer,
    // not back on the page behind it.
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const toFreeShipping = Math.max(0, FREE_SHIPPING_CENTS - bundle.totalCents);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Warenkorb"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="glass-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col shadow-lifted focus:outline-none"
          >
            <header className="flex items-center justify-between gap-4 border-b border-line p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="size-4 text-accent" aria-hidden />
                Warenkorb
                {lines.length > 0 && (
                  <span className="font-mono text-sm font-normal text-fg-subtle">
                    ({lines.reduce((s, l) => s + l.qty, 0)})
                  </span>
                )}
              </h2>
              <Button variant="ghost" size="icon" onClick={close} aria-label="Warenkorb schließen">
                <X className="size-4" />
              </Button>
            </header>

            {lines.length === 0 && !isLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="grid size-14 place-items-center rounded-lg border border-line bg-white/[0.03]">
                  <ShoppingBag className="size-5 text-fg-subtle" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">Noch nichts drin</p>
                  <p className="measure mx-auto mt-1.5 text-sm text-fg-muted">
                    Der Geschmacks-Finder stellt dir in 30 Sekunden ein passendes Set zusammen.
                  </p>
                </div>
                <Button asChild variant="secondary" onClick={close}>
                  <Link href="/produkte">Sortiment ansehen</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  {/* Free-shipping nudge: the cheapest upsell in the funnel */}
                  {toFreeShipping > 0 && (
                    <div className="border-b border-line bg-white/[0.02] px-5 py-4">
                      <p className="flex items-center gap-2 text-xs text-fg-muted">
                        <Truck className="size-3.5 text-accent" aria-hidden />
                        Noch{' '}
                        <strong className="font-mono font-medium text-fg">
                          {formatEur(toFreeShipping)}
                        </strong>{' '}
                        bis zum kostenlosen Versand
                      </p>
                      <Progress
                        value={(bundle.totalCents / FREE_SHIPPING_CENTS) * 100}
                        className="mt-2.5"
                      />
                    </div>
                  )}

                  <ul className="divide-y divide-line">
                    {lines.map((line) => (
                      <li key={line.product.id} className="flex gap-4 p-5">
                        <ProductVisual
                          hue={line.product.hue}
                          kind={line.product.kind}
                          className="size-16 shrink-0 rounded-sm"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/produkt/${line.product.slug}`}
                              onClick={close}
                              className="text-sm font-medium leading-snug hover:text-accent"
                            >
                              {line.product.name}
                            </Link>
                            <button
                              onClick={() => remove(line.product.id)}
                              className="shrink-0 rounded-sm p-1 text-fg-faint transition-colors hover:text-danger focus-visible:ring-2 focus-visible:ring-danger"
                              aria-label={`${line.product.name} entfernen`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1 rounded-sm border border-line">
                              <button
                                onClick={() => setQty(line.product.id, line.qty - 1)}
                                className="grid size-8 place-items-center rounded-sm text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                                aria-label="Menge verringern"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span
                                className="w-7 text-center font-mono text-sm tabular"
                                aria-live="polite"
                                aria-label={`Menge: ${line.qty}`}
                              >
                                {line.qty}
                              </span>
                              <button
                                onClick={() => setQty(line.product.id, line.qty + 1)}
                                className="grid size-8 place-items-center rounded-sm text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                                aria-label="Menge erhöhen"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                            <span className="font-mono text-sm tabular">
                              {formatEur(line.lineTotalCents)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-line p-5">
                    <BundleProgress evaluation={bundle} />
                  </div>
                </div>

                <footer className="border-t border-line p-5">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-fg-muted">Zwischensumme</dt>
                      <dd className="font-mono tabular">{formatEur(bundle.subtotalCents)}</dd>
                    </div>
                    {bundle.discountCents > 0 && (
                      <div className="flex justify-between text-accent">
                        <dt>Bundle-Rabatt ({bundle.tier?.name})</dt>
                        <dd className="font-mono tabular">−{formatEur(bundle.discountCents)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-fg-muted">Versand</dt>
                      <dd className={cn('font-mono tabular', shippingCents === 0 && 'text-accent')}>
                        {shippingCents === 0 ? 'Kostenlos' : formatEur(shippingCents)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
                      <dt>Gesamt</dt>
                      <dd className="font-mono tabular">{formatEur(grandTotalCents)}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-2xs text-fg-subtle">inkl. 19 % USt.</p>

                  <Button asChild size="lg" className="mt-4 w-full">
                    <Link href="/checkout" onClick={close}>
                      Zur Kasse
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </footer>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
