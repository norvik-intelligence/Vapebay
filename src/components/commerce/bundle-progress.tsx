'use client';

import { Check, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

import type { BundleEvaluation } from '@/lib/bundle';
import { cn, formatEur } from '@/lib/utils';
import { Progress } from '@/components/ui/misc';

/**
 * The AOV mechanic, made legible.
 *
 * The rule "1 Gerät + 2 Pods + 5 Liquids = 15 %" only works if the shopper can
 * see where they stand at every moment. Showing the *next* missing item is the
 * whole design — a bare "15 % ab 8 Artikeln" banner converts a fraction as well.
 */
export function BundleProgress({
  evaluation,
  className,
}: {
  evaluation: BundleEvaluation;
  className?: string;
}) {
  const { tier, nextTier, progress, completion, discountCents, nextStep } = evaluation;

  return (
    <section
      className={cn('rounded-md border border-line bg-white/[0.02] p-4', className)}
      aria-labelledby="bundle-progress-title"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id="bundle-progress-title" className="flex items-center gap-2 text-sm font-medium">
          <Gift className={cn('size-4', tier ? 'text-accent' : 'text-fg-subtle')} aria-hidden />
          {tier ? `${tier.name} aktiv` : 'Bundle-Rabatt'}
        </h3>
        {discountCents > 0 && (
          <motion.span
            key={discountCents}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-sm font-medium text-accent"
          >
            −{formatEur(discountCents)}
          </motion.span>
        )}
      </div>

      <Progress value={completion * 100} className="mt-3" />

      <ul className="mt-4 space-y-2">
        {progress.map((req) => (
          <li key={req.label} className="flex items-center gap-2.5 text-xs">
            <span
              className={cn(
                'grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                req.met ? 'border-accent bg-accent' : 'border-line-strong',
              )}
              aria-hidden
            >
              {req.met && <Check className="size-2.5 text-accent-fg" />}
            </span>
            <span className={cn('flex-1', req.met ? 'text-fg-muted line-through' : 'text-fg')}>
              {req.label}
            </span>
            <span className="font-mono tabular text-fg-subtle">
              {Math.min(req.have, req.qty)}/{req.qty}
            </span>
          </li>
        ))}
      </ul>

      {/* aria-live so a keyboard/screen-reader user hears the goal update as
          they add items, instead of silently passing a threshold. */}
      <p className="mt-3 text-xs leading-relaxed text-fg-subtle" aria-live="polite">
        {nextStep ??
          (tier
            ? `Maximaler Rabatt erreicht: ${Math.round(tier.discount * 100)} % auf alle Artikel im Set.`
            : `Stelle ein Set zusammen und spare bis zu ${
                nextTier ? Math.round(nextTier.discount * 100) : 15
              } %.`)}
      </p>
    </section>
  );
}
