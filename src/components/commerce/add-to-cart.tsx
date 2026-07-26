'use client';

import * as React from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

import { useCart } from '@/lib/store/cart';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AddToCart({
  productId,
  productName,
  maxQty,
  disabled,
  className,
}: {
  productId: string;
  productName: string;
  maxQty: number;
  disabled?: boolean;
  className?: string;
}) {
  const [qty, setQty] = React.useState(1);
  const add = useCart((s) => s.add);
  const cap = Math.max(1, Math.min(maxQty, 20));

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      <div className="flex h-12 items-center rounded-md border border-line">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1 || disabled}
          className="grid h-full w-11 place-items-center rounded-l-md text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-40"
          aria-label="Menge verringern"
        >
          <Minus className="size-4" />
        </button>
        <span
          className="w-10 text-center font-mono text-sm tabular"
          aria-live="polite"
          aria-label={`Menge: ${qty}`}
        >
          {qty}
        </span>
        <button
          onClick={() => setQty((q) => Math.min(cap, q + 1))}
          disabled={qty >= cap || disabled}
          className="grid h-full w-11 place-items-center rounded-r-md text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-40"
          aria-label="Menge erhöhen"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <Button
        size="lg"
        disabled={disabled}
        onClick={() => {
          add(productId, qty);
          toast.success('In den Warenkorb gelegt', {
            description: `${qty}× ${productName}`,
          });
        }}
        className="flex-1"
      >
        <ShoppingBag className="size-4" aria-hidden />
        {disabled ? 'Derzeit nicht verfügbar' : 'In den Warenkorb'}
      </Button>
    </div>
  );
}
