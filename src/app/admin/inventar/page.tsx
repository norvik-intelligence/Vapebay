import type { Metadata } from 'next';

import { SUPPLIERS } from '@/lib/admin/suppliers';
import { PRODUCTS } from '@/lib/data/catalog';
import { formatEur, formatNum, stockLevel } from '@/lib/utils';
import { AdminHeader, Panel, StatTile, TableWrap } from '@/components/admin/primitives';
import { SyncPanel } from '@/components/admin/sync-panel';

export const metadata: Metadata = { title: 'Lieferanten & Sync' };

export default function InventoryPage() {
  const tracked = SUPPLIERS.reduce((sum, s) => sum + s.itemsTracked, 0);
  const blindCapable = SUPPLIERS.filter((s) => s.supportsBlindDropship).length;
  const stockValue = PRODUCTS.reduce((sum, p) => sum + p.costCents * Math.max(p.stock, 0), 0);

  const critical = PRODUCTS.filter((p) => stockLevel(p.stock) !== 'in_stock').sort(
    (a, b) => a.stock - b.stock,
  );

  return (
    <>
      <AdminHeader
        title="Lieferanten & Bestandssync"
        description="Bestände und Einkaufspreise werden per SFTP-Feed oder REST-API eingelesen. Nach jedem Lauf werden die Verkaufspreise über die hinterlegten Aufschlagregeln neu berechnet."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Lieferanten" value={String(SUPPLIERS.length)} sub={`${blindCapable} mit Blind-Dropshipping`} />
        <StatTile label="Gelistete Artikel" value={formatNum(tracked)} sub="über alle Feeds" />
        <StatTile label="Lagerwert (EK)" value={formatEur(stockValue)} sub="eigener Bestand" />
        <StatTile
          label="Nachbestellen"
          value={String(critical.length)}
          sub="unter Meldebestand"
          tone={critical.some((p) => p.stock <= 0) ? 'danger' : 'warning'}
        />
      </div>

      <section className="mt-8" aria-labelledby="sync-title">
        <h2 id="sync-title" className="text-lg font-semibold tracking-tight">
          Sync-Konsole
        </h2>
        <p className="measure mt-2 text-sm text-fg-muted">
          Ein manueller Lauf überschreibt Bestand und EK-Preis für alle Artikel des Lieferanten.
          Verkaufspreise werden anschließend über die Aufschlagregeln neu abgeleitet — manuell
          gesetzte Preise bleiben unberührt.
        </p>
        <div className="mt-5">
          <SyncPanel suppliers={SUPPLIERS} />
        </div>
      </section>

      <Panel
        title="Meldebestand"
        description="Artikel unter 12 Stück oder vergriffen. Sortiert nach Dringlichkeit."
        className="mt-8"
      >
        <TableWrap>
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-fg-subtle">
                <th scope="col" className="px-5 py-3 font-medium">Artikel</th>
                <th scope="col" className="px-5 py-3 font-medium">Kategorie</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Bestand</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">EK</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">VK</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {critical.slice(0, 25).map((product) => {
                const marginPct = ((product.priceCents - product.costCents) / product.priceCents) * 100;
                return (
                  <tr key={product.id}>
                    <th scope="row" className="max-w-xs px-5 py-3 text-left font-normal">
                      <span className="block truncate text-xs">{product.name}</span>
                      <span className="font-mono text-2xs text-fg-subtle">{product.id}</span>
                    </th>
                    <td className="px-5 py-3 text-xs text-fg-muted">{product.categorySlug}</td>
                    <td
                      className={
                        product.stock <= 0
                          ? 'px-5 py-3 text-right font-mono text-xs tabular text-danger'
                          : 'px-5 py-3 text-right font-mono text-xs tabular text-warning'
                      }
                    >
                      {product.stock}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular text-fg-muted">
                      {formatEur(product.costCents)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular">
                      {formatEur(product.priceCents)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular text-accent">
                      {marginPct.toFixed(0)} %
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {critical.length > 25 && (
          <p className="border-t border-line px-5 py-3 text-xs text-fg-subtle">
            {critical.length - 25} weitere Artikel unter Meldebestand.
          </p>
        )}
      </Panel>

      <Panel
        title="Feed-Formate"
        description="Was der Importer je Transport erwartet."
        className="mt-6"
      >
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wide text-accent">SFTP / CSV</h3>
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">
              Semikolon-getrennt, Windows-1252 oder UTF-8. Der Parser identifiziert Spalten über
              Musterabgleich (EAN-13, Dezimalzahl, Ganzzahl) statt über feste Indizes, weil
              Lieferanten die Spaltenreihenfolge ohne Vorwarnung ändern.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-subtle p-3 font-mono text-2xs text-fg-muted">
{`4260123456789;Elfbar ELFA Pod 1.0;7,80;142
4260123456796;Elfbar ELFA Pod 0.8;7,80;0`}
            </pre>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wide text-accent">REST / JSON</h3>
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">
              Paginiert über <code className="font-mono">?cursor=</code>, Authentifizierung per
              Bearer-Token aus der Umgebungsvariable. Bei HTTP 429 wird mit exponentiellem Backoff
              bis zu fünfmal wiederholt.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-subtle p-3 font-mono text-2xs text-fg-muted">
{`{ "ean": "4260123456789",
  "stock": 142,
  "net_price": 7.80,
  "discontinued": false }`}
            </pre>
          </div>
        </div>
      </Panel>
    </>
  );
}
