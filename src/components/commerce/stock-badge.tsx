import { cn, STOCK_COPY, stockLevel } from '@/lib/utils';

/**
 * The live stock badge. Deliberately not a <Badge> — the pulsing dot plus the
 * dispatch promise is a distinct, higher-attention element and reusing the
 * generic badge would flatten it into the tag row beside it.
 */
export function StockBadge({ stock, className }: { stock: number; className?: string }) {
  const level = stockLevel(stock);
  const tone =
    level === 'in_stock'
      ? 'text-accent'
      : level === 'low_stock'
        ? 'text-warning'
        : 'text-fg-subtle';

  return (
    <p className={cn('flex items-center gap-1.5 text-xs font-medium', tone, className)}>
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full bg-current',
          level !== 'out_of_stock' && 'animate-pulse-dot',
        )}
        aria-hidden
      />
      <span>
        {STOCK_COPY[level].label}
        {level === 'low_stock' && (
          <span className="ml-1 font-mono tabular text-fg-subtle">({stock} Stk.)</span>
        )}
      </span>
    </p>
  );
}
