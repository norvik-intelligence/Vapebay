'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import type { PublicProduct } from '@/lib/data/catalog';
import { useCart } from '@/lib/store/cart';
import { cn, formatEur, stockLevel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StockBadge } from './stock-badge';
import { ProductVisual } from './product-visual';

/** The one-line technical spec that differentiates two otherwise identical rows. */
function specLine(product: PublicProduct): string {
  switch (product.kind) {
    case 'liquid':
    case 'nicsalt':
      return `${product.volumeMl} ml · ${product.nicotineMg} mg/ml · ${100 - (product.vg ?? 50)}/${product.vg ?? 50} PG/VG`;
    case 'pod':
    case 'coil':
      return `${product.coilOhm?.toFixed(1)} Ohm · ${product.packSize}er Pack`;
    case 'disposable':
      return `${product.puffs?.toLocaleString('de-DE')} Züge · ${product.nicotineMg} mg/ml`;
    case 'bundle':
      return `${product.packSize} Stück · Netto B2B`;
    default:
      return `Nachfüllbar · ${product.podFamilies[0]?.toUpperCase()}-Pods`;
  }
}

export function ProductCard({
  product,
  fitReason,
  fitLevel,
  className,
}: {
  product: PublicProduct;
  /** Optional compatibility annotation, supplied by the finder / pSEO pages. */
  fitReason?: string;
  fitLevel?: 'perfect' | 'good' | 'poor';
  className?: string;
}) {
  const add = useCart((s) => s.add);
  const level = stockLevel(product.stock);
  const soldOut = level === 'out_of_stock';
  const href = `/produkt/${product.slug}`;

  const onAdd = React.useCallback(() => {
    add(product.id);
    toast.success('In den Warenkorb gelegt', { description: product.name });
  }, [add, product.id, product.name]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass glass-hover group relative flex flex-col overflow-hidden rounded-lg',
        soldOut && 'opacity-60',
        className,
      )}
    >
      {/* The whole card is clickable via this stretched link, but the add button
          sits above it in z-order so it stays independently operable. */}
      <Link href={href} className="absolute inset-0 z-0" tabIndex={-1} aria-hidden />

      <ProductVisual hue={product.hue} kind={product.kind} className="h-44 w-full" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-2xs uppercase tracking-wide text-fg-subtle">
              {product.brandSlug.replace('-', ' ')}
            </p>
            <h3 className="mt-1 text-base font-medium leading-snug">
              <Link href={href} className="relative z-10 hover:text-accent focus-visible:text-accent">
                {product.name}
              </Link>
            </h3>
          </div>
          {product.compareAtCents && !soldOut && (
            <Badge variant="accent" className="shrink-0">
              -
              {Math.round((1 - product.priceCents / product.compareAtCents) * 100)}
              %
            </Badge>
          )}
        </div>

        <p className="font-mono text-xs text-fg-subtle">{specLine(product)}</p>

        {fitReason && (
          <p
            className={cn(
              'rounded-sm border px-2.5 py-2 text-xs leading-relaxed',
              fitLevel === 'perfect' && 'border-accent/30 bg-accent-subtle text-accent',
              fitLevel === 'good' && 'border-line bg-white/[0.04] text-fg-muted',
              fitLevel === 'poor' && 'border-warning/30 bg-warning-subtle text-warning',
            )}
          >
            {fitReason}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          <Star className="size-3.5 fill-current text-warning" aria-hidden />
          <span className="font-mono tabular">{product.rating.toFixed(1)}</span>
          <span aria-label={`${product.reviewCount} Bewertungen`}>({product.reviewCount})</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <StockBadge stock={product.stock} className="mb-1.5" />
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-medium tabular">
                {formatEur(product.priceCents)}
              </span>
              {product.compareAtCents && (
                <span className="font-mono text-xs text-fg-faint line-through tabular">
                  {formatEur(product.compareAtCents)}
                </span>
              )}
            </p>
          </div>

          <Button
            size="icon"
            onClick={onAdd}
            disabled={soldOut}
            className="relative z-10 shrink-0"
            aria-label={`${product.name} in den Warenkorb legen`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductGrid({
  products,
  className,
}: {
  products: PublicProduct[];
  className?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="glass rounded-lg p-12 text-center">
        <p className="font-medium">Keine Produkte gefunden</p>
        <p className="measure mx-auto mt-2 text-sm text-fg-muted">
          Passe die Filter an oder nutze den Kompatibilitäts-Finder, um passende Artikel für dein
          Gerät zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
