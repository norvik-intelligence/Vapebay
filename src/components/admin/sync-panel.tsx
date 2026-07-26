'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, RefreshCw, Server, HardDrive } from 'lucide-react';

import type { Supplier, SyncResult } from '@/lib/admin/suppliers';
import { formatEur, formatNum } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from './primitives';

/**
 * Supplier sync console.
 *
 * The result panel deliberately reports *deltas* (price changes, stock changes,
 * discontinued) rather than "sync complete". A merchant needs to know what
 * moved — a green checkmark that hides 40 price changes is worse than no sync.
 */
export function SyncPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [results, setResults] = React.useState<Record<string, SyncResult>>({});
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (supplierId: string): Promise<SyncResult> => {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });
      // A failed sync is a legitimate, reportable outcome — parse the body
      // either way instead of throwing away the error detail.
      return res.json();
    },
    onMutate: (supplierId) => setActiveId(supplierId),
    onSettled: (data, _error, supplierId) => {
      setActiveId(null);
      if (data) setResults((current) => ({ ...current, [supplierId]: data }));
    },
  });

  return (
    <div className="space-y-4">
      {suppliers.map((supplier) => {
        const result = results[supplier.id];
        const isRunning = activeId === supplier.id;
        const Icon = supplier.transport === 'sftp' ? HardDrive : Server;

        return (
          <article key={supplier.id} className="glass rounded-lg">
            <div className="flex flex-wrap items-start gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03]">
                <Icon className="size-4 text-fg-muted" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-medium">{supplier.name}</h3>
                  <StatusPill status={result?.status ?? supplier.lastSyncStatus} />
                  {supplier.supportsBlindDropship && (
                    <span className="rounded-sm border border-accent/30 bg-accent-subtle px-2 py-0.5 text-2xs font-medium text-accent">
                      Blind-Dropshipping
                    </span>
                  )}
                </div>

                <p className="mt-1 break-all font-mono text-2xs text-fg-subtle">
                  {supplier.endpoint}
                </p>

                <p className="measure mt-3 text-xs leading-relaxed text-fg-muted">
                  {supplier.notes}
                </p>

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-2xs">
                  <Meta label="Zeitplan" value={supplier.scheduleLabel} />
                  <Meta label="Artikel" value={formatNum(supplier.itemsTracked)} />
                  <Meta label="Vorlauf" value={`${supplier.leadTimeDays} Tage`} />
                  <Meta label="Mindestbestellwert" value={formatEur(supplier.minOrderCents)} />
                  <Meta
                    label="Letzter Lauf"
                    value={new Date(supplier.lastSyncAt).toLocaleString('de-DE')}
                  />
                </dl>

                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {supplier.brands.map((brand) => (
                    <li
                      key={brand}
                      className="rounded-sm border border-line bg-white/[0.04] px-2 py-0.5 text-2xs capitalize text-fg-subtle"
                    >
                      {brand.replace('-', ' ')}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                loading={isRunning}
                onClick={() => mutation.mutate(supplier.id)}
              >
                {!isRunning && <RefreshCw className="size-4" aria-hidden />}
                {isRunning ? 'Läuft…' : 'Jetzt synchronisieren'}
              </Button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-t border-line"
                >
                  <div className="p-5" aria-live="polite">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {result.status === 'failed' ? (
                        <>
                          <AlertTriangle className="size-4 text-danger" aria-hidden />
                          <span className="text-danger">Sync fehlgeschlagen</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4 text-accent" aria-hidden />
                          <span>
                            {formatNum(result.itemsRead)} Artikel gelesen in{' '}
                            {(result.durationMs / 1000).toFixed(1)} s
                          </span>
                        </>
                      )}
                    </p>

                    {result.status !== 'failed' && (
                      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Delta label="Preisänderungen" value={result.priceChanges} />
                        <Delta label="Bestandsänderungen" value={result.stockChanges} />
                        <Delta label="Neue Artikel" value={result.newItems} tone="accent" />
                        <Delta label="Ausgelistet" value={result.discontinued} tone="warning" />
                      </dl>
                    )}

                    {result.errors.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {result.errors.map((error) => (
                          <li
                            key={error}
                            className="flex gap-2 text-xs leading-relaxed text-warning"
                          >
                            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
                            {error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-fg-muted">{value}</dd>
    </div>
  );
}

function Delta({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'accent' | 'warning';
}) {
  return (
    <div className="rounded-md border border-line bg-white/[0.02] p-3">
      <dt className="text-2xs text-fg-subtle">{label}</dt>
      <dd
        className={
          tone === 'accent'
            ? 'mt-1 font-mono text-lg tabular text-accent'
            : tone === 'warning'
              ? 'mt-1 font-mono text-lg tabular text-warning'
              : 'mt-1 font-mono text-lg tabular'
        }
      >
        {value}
      </dd>
    </div>
  );
}
