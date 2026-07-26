import type { ProductKind } from '@/lib/types';

/**
 * Supplier registry + sync simulator.
 *
 * Two transports because that is what the wholesale market actually runs on:
 * the modern distributors expose a REST catalog, the older ones drop a CSV on
 * an SFTP share every night. Both are modelled so the admin UI and the routing
 * logic don't assume one shape.
 */

export interface Supplier {
  id: string;
  name: string;
  transport: 'sftp' | 'rest';
  endpoint: string;
  /** Cron expression, evaluated by the sync scheduler. */
  schedule: string;
  scheduleLabel: string;
  lastSyncAt: string;
  lastSyncStatus: 'ok' | 'partial' | 'failed' | 'never';
  itemsTracked: number;
  supportsBlindDropship: boolean;
  leadTimeDays: number;
  /** Brands this supplier can actually fulfil. Drives order routing. */
  brands: string[];
  /** Product kinds carried, for the coverage matrix in the admin UI. */
  kinds: ProductKind[];
  minOrderCents: number;
  notes: string;
}

export const SUPPLIERS: Supplier[] = [
  {
    id: 'sup-eurovape',
    name: 'EuroVape Distribution B.V.',
    transport: 'rest',
    endpoint: 'https://api.eurovape.nl/v2/catalog',
    schedule: '*/30 * * * *',
    scheduleLabel: 'Alle 30 Minuten',
    lastSyncAt: '2026-07-26T08:42:00Z',
    lastSyncStatus: 'ok',
    itemsTracked: 1284,
    supportsBlindDropship: true,
    leadTimeDays: 1,
    brands: ['elfbar', 'lost-mary', 'vaporesso', 'uwell'],
    kinds: ['device', 'pod', 'coil', 'disposable'],
    minOrderCents: 25000,
    notes:
      'Bester Datenlieferant im Portfolio: liefert Bestand, EK und EAN in einem Call. Blind-Dropshipping inklusive, Etikett wird mit unserem Absender bedruckt.',
  },
  {
    id: 'sup-nordliquid',
    name: 'Nordliquid Großhandel GmbH',
    transport: 'sftp',
    endpoint: 'sftp://feed.nordliquid.de/out/bestand.csv',
    schedule: '0 */4 * * *',
    scheduleLabel: 'Alle 4 Stunden',
    lastSyncAt: '2026-07-26T06:00:00Z',
    lastSyncStatus: 'partial',
    itemsTracked: 642,
    supportsBlindDropship: true,
    leadTimeDays: 2,
    brands: ['al-fakher', 'elfbar', 'lost-mary'],
    kinds: ['liquid', 'nicsalt'],
    minOrderCents: 15000,
    notes:
      'CSV ohne Header-Zeile, Spaltenreihenfolge ändert sich gelegentlich ohne Ankündigung — der Parser prüft deshalb auf EAN-Muster statt auf Spaltenindex.',
  },
  {
    id: 'sup-shenzhen',
    name: 'Shenzhen Vapor Trading Co.',
    transport: 'rest',
    endpoint: 'https://openapi.szvapor.cn/stock',
    schedule: '0 3 * * *',
    scheduleLabel: 'Täglich 03:00',
    lastSyncAt: '2026-07-26T03:00:00Z',
    lastSyncStatus: 'ok',
    itemsTracked: 2140,
    supportsBlindDropship: false,
    leadTimeDays: 14,
    brands: ['randm', 'flerbar', 'hqd'],
    kinds: ['disposable', 'device', 'bundle'],
    minOrderCents: 120000,
    notes:
      'Direktimport mit 14 Tagen Vorlauf und Zollabwicklung. Kein Dropshipping — Ware geht ins eigene Lager. Nur für planbare Nachbestellungen.',
  },
  {
    id: 'sup-rheinpod',
    name: 'RheinPod Handel e.K.',
    transport: 'sftp',
    endpoint: 'sftp://transfer.rheinpod.de/stock/daily.csv',
    schedule: '0 5,17 * * *',
    scheduleLabel: 'Täglich 05:00 & 17:00',
    lastSyncAt: '2026-07-25T17:00:00Z',
    lastSyncStatus: 'failed',
    itemsTracked: 318,
    supportsBlindDropship: true,
    leadTimeDays: 1,
    brands: ['hqd', 'vaporesso', 'uwell'],
    kinds: ['pod', 'coil'],
    minOrderCents: 8000,
    notes:
      'Letzter Lauf abgebrochen: SSH-Hostkey des Servers hat sich geändert. Muss manuell bestätigt werden, bevor der Sync wieder greift.',
  },
];

export const supplierById = (id: string) => SUPPLIERS.find((s) => s.id === id);

export interface SyncResult {
  supplierId: string;
  supplierName: string;
  startedAt: string;
  durationMs: number;
  itemsRead: number;
  priceChanges: number;
  stockChanges: number;
  newItems: number;
  discontinued: number;
  errors: string[];
  status: 'ok' | 'partial' | 'failed';
}

/**
 * Deterministic sync simulation.
 *
 * Real implementation: pull the feed, diff against `products`, write the delta
 * inside one transaction, and re-derive retail prices through the markup rules.
 * The numbers here are derived from the supplier id so the admin UI shows a
 * stable, plausible result rather than reshuffling on every render.
 */
export function simulateSync(supplierId: string): SyncResult {
  const supplier = supplierById(supplierId);
  if (!supplier) {
    return {
      supplierId,
      supplierName: 'Unbekannt',
      startedAt: new Date().toISOString(),
      durationMs: 0,
      itemsRead: 0,
      priceChanges: 0,
      stockChanges: 0,
      newItems: 0,
      discontinued: 0,
      errors: ['Lieferant nicht gefunden'],
      status: 'failed',
    };
  }

  let seed = 0;
  for (const char of supplier.id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const at = (offset: number, max: number) => ((seed >> offset) % max) + 1;

  const failed = supplier.lastSyncStatus === 'failed';
  const partial = supplier.lastSyncStatus === 'partial';

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    startedAt: new Date().toISOString(),
    durationMs: supplier.transport === 'sftp' ? 2400 + at(3, 1800) : 420 + at(5, 600),
    itemsRead: failed ? 0 : supplier.itemsTracked,
    priceChanges: failed ? 0 : at(7, 40),
    stockChanges: failed ? 0 : at(11, 180),
    newItems: failed ? 0 : at(13, 8),
    discontinued: failed ? 0 : at(17, 5),
    errors: failed
      ? ['SSH-Hostkey stimmt nicht mit dem hinterlegten Fingerprint überein — Verbindung abgelehnt']
      : partial
        ? ['14 Zeilen ohne gültige EAN übersprungen', 'Spalte "UVP" fehlte, Aufschlagregel angewendet']
        : [],
    status: failed ? 'failed' : partial ? 'partial' : 'ok',
  };
}
