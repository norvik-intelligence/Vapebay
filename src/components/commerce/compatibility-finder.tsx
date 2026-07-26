'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, Cpu, Loader2 } from 'lucide-react';

import type { PublicProduct } from '@/lib/data/catalog';
import type { Device } from '@/lib/types';
import { coilSegment } from '@/lib/data/devices';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProductCard } from './product-card';

interface CompatResponse {
  device: Device;
  ohm: number | null;
  recommendedMg: 10 | 20;
  upgradePath: Device | null;
  pods: PublicProduct[];
  liquids: { product: PublicProduct; level: 'perfect' | 'good' | 'poor'; reason: string }[];
}

/**
 * Interactive compatibility finder.
 *
 * Two selects, no search box: the failure mode of a text search here is a
 * shopper typing "xros3" and getting nothing, then buying the wrong pod
 * somewhere else. A closed list cannot return zero results.
 */
export function CompatibilityFinder({
  devices,
  initialDeviceSlug,
  className,
}: {
  /** Trimmed device list — only what the picker needs, not the full registry. */
  devices: Pick<Device, 'slug' | 'name' | 'brandSlug' | 'coilOhms' | 'podFamily' | 'drawStyle'>[];
  initialDeviceSlug?: string;
  className?: string;
}) {
  const [deviceSlug, setDeviceSlug] = React.useState(initialDeviceSlug ?? devices[0]?.slug ?? '');
  const [ohm, setOhm] = React.useState<number | null>(null);

  const selected = devices.find((d) => d.slug === deviceSlug);

  // Resetting the resistance on device change avoids the silent bug where a
  // 1.2 Ohm selection survives a switch to a device that has no 1.2 Ohm option.
  React.useEffect(() => setOhm(null), [deviceSlug]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['compat', deviceSlug, ohm],
    enabled: Boolean(deviceSlug),
    queryFn: async (): Promise<CompatResponse> => {
      const params = new URLSearchParams({ device: deviceSlug });
      if (ohm !== null) params.set('ohm', String(ohm));
      const res = await fetch(`/api/compat?${params}`);
      if (!res.ok) throw new Error('Kompatibilität konnte nicht geladen werden');
      return res.json();
    },
  });

  const isDisposable = selected?.podFamily === 'disposable';

  return (
    <section className={cn('glass rounded-xl p-6 sm:p-8', className)} aria-labelledby="compat-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wide text-accent">
            <Cpu className="size-3.5" aria-hidden />
            Kompatibilitäts-Engine
          </p>
          <h2 id="compat-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Was passt in dein Gerät?
          </h2>
          <p className="measure mt-2 text-sm text-fg-muted">
            Gerät wählen, Widerstand wählen — wir zeigen ausschließlich Pods, Coils und Liquids, die
            zu 100 % passen. Keine Fehlkäufe.
          </p>
        </div>
        {isFetching && (
          <Loader2 className="size-4 animate-spin text-fg-subtle" aria-label="Lädt" />
        )}
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="compat-device" className="text-sm font-medium">
            Dein Gerät
          </label>
          <select
            id="compat-device"
            value={deviceSlug}
            onChange={(e) => setDeviceSlug(e.target.value)}
            className={cn(
              'h-11 w-full rounded-md border border-line bg-bg-elevated px-3.5 text-sm text-fg',
              'transition-colors hover:border-line-strong',
              'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            )}
          >
            {devices.map((device) => (
              <option key={device.slug} value={device.slug}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2" disabled={isDisposable}>
          <legend className="text-sm font-medium">Widerstand</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Widerstand in Ohm">
            <ResistanceChip label="Alle" selected={ohm === null} onSelect={() => setOhm(null)} />
            {selected?.coilOhms.map((value) => (
              <ResistanceChip
                key={value}
                label={`${value.toFixed(1)} Ω`}
                selected={ohm === value}
                onSelect={() => setOhm(value)}
              />
            ))}
          </div>
          {isDisposable && (
            <p className="text-xs text-fg-subtle">
              Einweggeräte haben einen fest verbauten Coil — es gibt nichts zu wechseln.
            </p>
          )}
        </fieldset>
      </div>

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Die Kompatibilitätsdaten konnten nicht geladen werden. Bitte lade die Seite neu.
        </p>
      )}

      <AnimatePresence mode="wait">
        {data && (
          <motion.div
            key={`${data.device.slug}-${data.ohm}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            {data.upgradePath ? (
              <div className="flex flex-col gap-4 rounded-md border border-warning/30 bg-warning-subtle p-5 sm:flex-row sm:items-center">
                <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning">
                    Die {data.device.name} ist ein Einweggerät
                  </p>
                  <p className="measure mt-1 text-sm text-fg-muted">
                    Es gibt keine passenden Pods oder Coils — das Gerät wird nach dem Verbrauch
                    entsorgt. Wer dasselbe Zugverhalten dauerhaft und rund 70 % günstiger will,
                    nimmt die {data.upgradePath.name}.
                  </p>
                </div>
                <Button asChild variant="secondary" className="shrink-0">
                  <Link href={`/produkt/${data.upgradePath.slug}`}>
                    Ansehen
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-accent/25 bg-accent-subtle px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-accent">
                    <CheckCircle2 className="size-4" aria-hidden />
                    {data.pods.length === 1
                      ? '1 passender Pod gefunden'
                      : `${data.pods.length} passende Pods gefunden`}
                  </p>
                  <p className="font-mono text-xs text-fg-muted">
                    Empfohlene Stärke: {data.recommendedMg} mg/ml
                  </p>
                  <p className="font-mono text-xs text-fg-muted">
                    Zugtyp: {data.device.drawStyle}
                  </p>
                </div>

                {data.pods.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium">Pods & Coils</h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {data.pods.slice(0, 3).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                )}

                {data.liquids.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium">
                      Optimale Liquids für {data.ohm ? `${data.ohm.toFixed(1)} Ω` : 'dieses Gerät'}
                    </h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {data.liquids.slice(0, 3).map((fit) => (
                        <ProductCard
                          key={fit.product.id}
                          product={fit.product}
                          fitReason={fit.reason}
                          fitLevel={fit.level}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex justify-center">
                  <Button asChild variant="outline">
                    <Link
                      href={`/kompatibel/${data.device.slug}/${coilSegment(
                        data.ohm ?? data.device.coilOhms[0],
                      )}`}
                    >
                      Alle Details zur {data.device.name}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ResistanceChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'h-11 rounded-md border px-4 font-mono text-sm tabular transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-line bg-white/[0.02] text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}
