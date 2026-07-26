import type { Config } from 'tailwindcss';

/**
 * Vapebay design system.
 *
 * Discipline notes (why this config looks the way it does):
 * - ONE accent (`accent`, a vapour cyan). "In stock" reuses it rather than
 *   introducing a second green that would sit 40° away in hue and read as noise.
 *   Warning (amber) and danger (red) are the only other hues in the system.
 * - ONE cool-neutral ramp. No warm grays anywhere.
 * - Radius scale is 4 steps. Components use at most two of them.
 * - All colors resolve through CSS variables so dark is a designed theme,
 *   not an inversion.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--color-bg)',
          elevated: 'var(--color-bg-elevated)',
          subtle: 'var(--color-bg-subtle)',
          inverse: 'var(--color-bg-inverse)',
        },
        fg: {
          DEFAULT: 'var(--color-fg)',
          muted: 'var(--color-fg-muted)',
          subtle: 'var(--color-fg-subtle)',
          faint: 'var(--color-fg-faint)',
          inverse: 'var(--color-fg-inverse)',
        },
        line: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          fg: 'var(--color-accent-fg)',
          subtle: 'var(--color-accent-subtle)',
          ring: 'var(--color-accent-ring)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          subtle: 'var(--color-warning-subtle)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          subtle: 'var(--color-danger-subtle)',
        },
      },
      borderRadius: {
        sm: '0.5rem', // 8
        md: '0.75rem', // 12
        lg: '1rem', // 16
        xl: '1.5rem', // 24
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Perfect-fourth-ish scale. Six sizes carry ~95% of the UI.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.018em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.022em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.026em' }],
        '5xl': ['3rem', { lineHeight: '1.08', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1.04', letterSpacing: '-0.034em' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.038em' }],
      },
      boxShadow: {
        // One shadow family: soft, cool-tinted, never black-heavy.
        subtle: '0 1px 2px rgba(0,0,0,0.35)',
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        lifted: '0 2px 4px rgba(0,0,0,0.4), 0 16px 40px -16px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px var(--color-accent-ring), 0 8px 32px -8px var(--color-accent-ring)',
      },
      backgroundImage: {
        'mesh-vapour':
          'radial-gradient(60% 50% at 15% 0%, var(--color-accent-ring) 0%, transparent 60%), radial-gradient(50% 45% at 90% 10%, rgba(120,140,255,0.10) 0%, transparent 65%)',
      },
      keyframes: {
        'drift-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'vapour-float': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.35' },
          '50%': { transform: 'translate3d(0,-24px,0) scale(1.08)', opacity: '0.55' },
        },
        'pulse-dot': {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.82)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'drift-up': 'drift-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'vapour-float': 'vapour-float 14s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s cubic-bezier(0.22,1,0.36,1)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
