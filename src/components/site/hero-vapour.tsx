/**
 * Hero atmosphere.
 *
 * Pure CSS on purpose: a canvas particle field costs ~40KB of JS and a
 * continuous rAF loop, which on a €10 VPS serving mobile traffic is the wrong
 * trade for a background effect. Three blurred, offset radials read as drifting
 * vapour and cost nothing. `prefers-reduced-motion` stops the drift globally
 * via the rule in globals.css.
 */
export function HeroVapour() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-32 -top-24 size-[36rem] animate-vapour-float rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--color-accent-ring) 0%, transparent 65%)',
          animationDelay: '0s',
        }}
      />
      <div
        className="absolute right-[-10%] top-1/4 size-[28rem] animate-vapour-float rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(110,130,255,0.16) 0%, transparent 65%)',
          animationDelay: '-5s',
        }}
      />
      <div
        className="absolute bottom-[-20%] left-1/3 size-[32rem] animate-vapour-float rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(45,226,230,0.10) 0%, transparent 70%)',
          animationDelay: '-9s',
        }}
      />

      {/* Hairline grid — the "technical" personality element that keeps the
          glow from reading as a generic startup gradient. */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(80% 60% at 30% 20%, #000 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 30% 20%, #000 0%, transparent 75%)',
        }}
      />
    </div>
  );
}
