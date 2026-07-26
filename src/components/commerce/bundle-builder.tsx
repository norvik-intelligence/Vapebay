'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, Check, Info, Minus, Plus } from 'lucide-react';

import type { PublicProduct } from '@/lib/data/catalog';
import { evaluateBundle } from '@/lib/bundle';
import { useCart } from '@/lib/store/cart';
import { cn, formatEur } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProductVisual } from './product-visual';
import { BundleProgress } from './bundle-progress';
import { StockBadge } from './stock-badge';

type Selection = Record<string, number>;

/**
 * Bundle builder.
 *
 * Three stacked steps rather than three columns: on mobile — where most of this
 * traffic lands — columns collapse into a 2000px scroll with no sense of
 * progress. Stacked steps keep the sticky summary in view the whole way down.
 */
export function BundleBuilder({
  devices,
  pods,
  liquids,
}: {
  devices: PublicProduct[];
  pods: PublicProduct[];
  liquids: PublicProduct[];
}) {
  const [selection, setSelection] = React.useState<Selection>({});
  const addToCart = useCart((s) => s.add);

  const all = React.useMemo(
    () => new Map([...devices, ...pods, ...liquids].map((p) => [p.id, p])),
    [devices, pods, liquids],
  );

  const lines = Object.entries(selection)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ product: all.get(id)!, qty }))
    .filter((line) => Boolean(line.product));

  const evaluation = evaluateBundle(lines);

  const chosenDevice = lines.find((l) => l.product.kind === 'device')?.product ?? null;

  // Pods only fit the device that was actually selected. Showing all 14 pod
  // variants and letting the shopper pick a wrong one is exactly the failure
  // this whole site exists to prevent.
  const eligiblePods = chosenDevice
    ? pods.filter((p) => p.podFamilies.some((f) => chosenDevice.podFamilies.includes(f)))
    : pods;

  const setQty = (id: string, qty: number) =>
    setSelection((current) => {
      const next = { ...current, [id]: Math.max(0, Math.min(qty, 20)) };
      if (next[id] === 0) delete next[id];

      // Switching device invalidates any pod already chosen for the old one.
      const product = all.get(id);
      if (product?.kind === 'device' && qty > 0) {
        for (const otherId of Object.keys(next)) {
          const other = all.get(otherId);
          if (other?.kind === 'device' && otherId !== id) delete next[otherId];
          if (
            (other?.kind === 'pod' || other?.kind === 'coil') &&
            !other.podFamilies.some((f) => product.podFamilies.includes(f))
          ) {
            delete next[otherId];
          }
        }
      }
      return next;
    });

  const addAll = () => {
    lines.forEach((line) => addToCart(line.product.id, line.qty));
    toast.success('Set im Warenkorb', {
      description:
        evaluation.discountCents > 0
          ? `${lines.reduce((s, l) => s + l.qty, 0)} Artikel · ${formatEur(evaluation.discountCents)} gespart`
          : `${lines.reduce((s, l) => s + l.qty, 0)} Artikel hinzugefügt`,
    });
    setSelection({});
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-12">
        <Step
          index={1}
          title="Wähle dein Gerät"
          hint="Ein Pod-System als Basis. Danach zeigen wir nur Pods, die dazu passen."
        >
          <PickerGrid
            products={devices}
            selection={selection}
            onChange={setQty}
            singleSelect
          />
        </Step>

        <Step
          index={2}
          title="Passende Pods"
          hint={
            chosenDevice
              ? `Gefiltert auf die ${chosenDevice.podFamilies[0]?.toUpperCase()}-Serie. Zwei Packs ergeben den vollen Rabatt.`
              : 'Wähle zuerst ein Gerät — dann filtern wir auf passende Pods.'
          }
          disabled={!chosenDevice}
        >
          <PickerGrid products={eligiblePods} selection={selection} onChange={setQty} />
        </Step>

        <Step
          index={3}
          title="Liquids ergänzen"
          hint="Alle 50/50 PG/VG und damit für jedes MTL- und RDL-Pod-System geeignet. Fünf Flaschen ergeben den vollen Rabatt."
        >
          <PickerGrid products={liquids.slice(0, 18)} selection={selection} onChange={setQty} />
        </Step>
      </div>

      {/* Sticky summary: the discount has to stay visible while the shopper
          scrolls the pickers, or the mechanic is invisible at the moment of
          the decision. */}
      <aside className="lg:sticky lg:top-28">
        <div className="glass rounded-lg p-5">
          <h2 className="text-base font-semibold">Dein Set</h2>

          <AnimatePresence initial={false}>
            {lines.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-sm leading-relaxed text-fg-muted"
              >
                Noch nichts gewählt. Starte mit einem Gerät in Schritt 1.
              </motion.p>
            ) : (
              <motion.ul
                key="lines"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 space-y-2.5"
              >
                {lines.map((line) => (
                  <li key={line.product.id} className="flex items-center gap-3">
                    <ProductVisual
                      hue={line.product.hue}
                      kind={line.product.kind}
                      className="size-9 shrink-0 rounded-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-fg-muted">
                        {line.product.name}
                      </span>
                      <span className="font-mono text-2xs text-fg-subtle">
                        {line.qty}× {formatEur(line.product.priceCents)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular">
                      {formatEur(line.product.priceCents * line.qty)}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          <BundleProgress evaluation={evaluation} className="mt-5" />

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Zwischensumme</dt>
              <dd className="font-mono tabular">{formatEur(evaluation.subtotalCents)}</dd>
            </div>
            {evaluation.discountCents > 0 && (
              <div className="flex justify-between text-accent">
                <dt>{evaluation.tier?.name}</dt>
                <dd className="font-mono tabular">−{formatEur(evaluation.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
              <dt>Gesamt</dt>
              <dd className="font-mono tabular">{formatEur(evaluation.totalCents)}</dd>
            </div>
          </dl>

          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={lines.length === 0}
            onClick={addAll}
          >
            Set in den Warenkorb
            <ArrowRight className="size-4" aria-hidden />
          </Button>

          <p className="mt-3 flex gap-2 text-2xs leading-relaxed text-fg-subtle">
            <Info className="mt-px size-3 shrink-0" aria-hidden />
            Der Rabatt wird auch im Warenkorb neu berechnet — du kannst dort jederzeit ergänzen oder
            entfernen.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Step({
  index,
  title,
  hint,
  disabled,
  children,
}: {
  index: number;
  title: string;
  hint: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`step-${index}`} className={cn(disabled && 'opacity-55')}>
      <div className="flex items-start gap-3">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-subtle font-mono text-xs text-accent"
          aria-hidden
        >
          {index}
        </span>
        <div>
          <h2 id={`step-${index}`} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="measure mt-1 text-sm text-fg-muted">{hint}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PickerGrid({
  products,
  selection,
  onChange,
  singleSelect,
}: {
  products: PublicProduct[];
  selection: Selection;
  onChange: (id: string, qty: number) => void;
  singleSelect?: boolean;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-md border border-line bg-white/[0.02] p-5 text-sm text-fg-muted">
        Für diese Auswahl ist aktuell nichts lieferbar.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const qty = selection[product.id] ?? 0;
        const active = qty > 0;

        return (
          <div
            key={product.id}
            className={cn(
              'flex flex-col rounded-md border p-4 transition-all duration-200',
              active
                ? 'border-accent bg-accent-subtle'
                : 'border-line bg-white/[0.02] hover:border-line-strong',
            )}
          >
            <div className="flex items-start gap-3">
              <ProductVisual
                hue={product.hue}
                kind={product.kind}
                className="size-12 shrink-0 rounded-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{product.name}</p>
                <p className="mt-1 font-mono text-xs tabular text-fg-subtle">
                  {formatEur(product.priceCents)}
                </p>
              </div>
              {active && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent">
                  <Check className="size-3 text-accent-fg" aria-hidden />
                </span>
              )}
            </div>

            <StockBadge stock={product.stock} className="mt-3" />

            <div className="mt-4">
              {singleSelect ? (
                <Button
                  variant={active ? 'default' : 'secondary'}
                  size="sm"
                  className="w-full"
                  onClick={() => onChange(product.id, active ? 0 : 1)}
                  aria-pressed={active}
                >
                  {active ? 'Ausgewählt' : 'Wählen'}
                </Button>
              ) : (
                <div className="flex items-center justify-between rounded-sm border border-line">
                  <button
                    onClick={() => onChange(product.id, qty - 1)}
                    disabled={qty === 0}
                    className="grid size-9 place-items-center rounded-l-sm text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-35"
                    aria-label={`Weniger ${product.name}`}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span
                    className="font-mono text-sm tabular"
                    aria-live="polite"
                    aria-label={`${product.name}: ${qty} gewählt`}
                  >
                    {qty}
                  </span>
                  <button
                    onClick={() => onChange(product.id, qty + 1)}
                    className="grid size-9 place-items-center rounded-r-sm text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                    aria-label={`Mehr ${product.name}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
