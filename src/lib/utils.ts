import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const eur = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

/** Cents → "12,99 €". The only place cents become a string. */
export const formatEur = (cents: number) => eur.format(cents / 100);

const pct = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 });
export const formatPct = (ratio: number) => pct.format(ratio);

const num = new Intl.NumberFormat('de-DE');
export const formatNum = (value: number) => num.format(value);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Stock thresholds are business rules, not display logic — a single definition
 * keeps the storefront badge, the admin table and the JSON-LD availability
 * field from ever disagreeing.
 */
export type StockLevel = 'in_stock' | 'low_stock' | 'out_of_stock';

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= 12) return 'low_stock';
  return 'in_stock';
}

export const STOCK_COPY: Record<StockLevel, { label: string; schema: string }> = {
  in_stock: { label: 'Auf Lager · Versand heute', schema: 'https://schema.org/InStock' },
  low_stock: { label: 'Nur noch wenige', schema: 'https://schema.org/LimitedAvailability' },
  out_of_stock: { label: 'Vergriffen', schema: 'https://schema.org/OutOfStock' },
};

/** Cut-off for same-day dispatch, used by the delivery-promise copy. */
export const CUTOFF_HOUR = 15;

export function deliveryPromise(now = new Date()): string {
  const beforeCutoff = now.getHours() < CUTOFF_HOUR;
  const weekday = now.getDay();
  if (weekday === 0) return 'Versand am Montag';
  if (weekday === 6) return 'Versand am Montag';
  return beforeCutoff ? 'Heute verschickt' : 'Morgen verschickt';
}
