import { cn } from '@/lib/utils';
import type { ProductKind } from '@/lib/types';

const SILHOUETTE: Record<ProductKind, { w: string; h: string; radius: string }> = {
  device: { w: 'w-9', h: 'h-24', radius: 'rounded-[0.5rem]' },
  disposable: { w: 'w-10', h: 'h-28', radius: 'rounded-[0.75rem]' },
  pod: { w: 'w-11', h: 'h-16', radius: 'rounded-[0.375rem]' },
  coil: { w: 'w-8', h: 'h-12', radius: 'rounded-full' },
  liquid: { w: 'w-12', h: 'h-20', radius: 'rounded-[0.25rem]' },
  nicsalt: { w: 'w-12', h: 'h-20', radius: 'rounded-[0.25rem]' },
  bundle: { w: 'w-20', h: 'h-16', radius: 'rounded-[0.25rem]' },
};

/**
 * Product imagery stand-in.
 *
 * A real catalog ships photography; this generates a deterministic, per-product
 * silhouette from the flavour hue so the grid reads as a designed system rather
 * than a wall of identical gray placeholders. Swap this component for <Image>
 * when the supplier feed provides assets — nothing else needs to change.
 */
export function ProductVisual({
  hue,
  kind,
  className,
}: {
  hue: number;
  kind: ProductKind;
  className?: string;
}) {
  const shape = SILHOUETTE[kind];

  return (
    <div
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-md bg-bg-subtle',
        className,
      )}
      aria-hidden
    >
      {/* Atmosphere wash, tinted by the product's own hue */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(70% 60% at 50% 110%, hsl(${hue} 80% 55% / 0.35) 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -inset-8 animate-vapour-float blur-2xl"
        style={{
          background: `radial-gradient(40% 40% at 35% 30%, hsl(${hue} 90% 60% / 0.28) 0%, transparent 70%)`,
        }}
      />

      {/* The device silhouette */}
      <div
        className={cn('relative border', shape.w, shape.h, shape.radius)}
        style={{
          background: `linear-gradient(160deg, hsl(${hue} 55% 42% / 0.9), hsl(${(hue + 40) % 360} 60% 22% / 0.95))`,
          borderColor: `hsl(${hue} 80% 70% / 0.35)`,
          boxShadow: `0 12px 32px -12px hsl(${hue} 80% 50% / 0.55), inset 0 1px 0 hsl(${hue} 90% 85% / 0.25)`,
        }}
      >
        {/* Specular highlight — one strip, keeps the object reading as glass/metal */}
        <span
          className="absolute inset-y-2 left-1.5 w-[3px] rounded-full opacity-50"
          style={{ background: `linear-gradient(hsl(${hue} 100% 92% / 0.9), transparent)` }}
        />
        {(kind === 'liquid' || kind === 'nicsalt') && (
          <span
            className="absolute inset-x-2 bottom-2 h-2/3 rounded-[0.15rem] opacity-70"
            style={{ background: `hsl(${hue} 85% 55% / 0.55)` }}
          />
        )}
      </div>
    </div>
  );
}
