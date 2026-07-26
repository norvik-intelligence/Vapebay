import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, PackageSearch, RefreshCw } from 'lucide-react';

import { allOrders, dashboardKpis, orderRouting, orderTotals } from '@/lib/admin/orders';
import { SUPPLIERS } from '@/lib/admin/suppliers';
import { totalPseoRoutes, PSEO_TEMPLATES } from '@/lib/seo/pseo';
import { listVerifications } from '@/lib/db/compliance';
import { PRODUCTS } from '@/lib/data/catalog';
import { formatEur, stockLevel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, StatTile, StatusPill, TableWrap } from '@/components/admin/primitives';

export const metadata: Metadata = { title: 'Übersicht' };

// Stock and verification logs change per request; never cache this page.
export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const kpi = dashboardKpis();
  const failedSyncs = SUPPLIERS.filter((s) => s.lastSyncStatus === 'failed');
  const verifications = listVerifications(5);
  const orders = allOrders();
  const recent = orders.slice(0, 6);

  const criticalStock = PRODUCTS.filter((p) => stockLevel(p.stock) !== 'in_stock')
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  return (
    <>
      <AdminHeader
        title="Übersicht"
        description="Umsatz, Marge, Lieferantenstatus und Compliance auf einen Blick. Alle Werte beziehen sich auf die letzten 24 Stunden."
      >
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/inventar">
            <RefreshCw className="size-4" aria-hidden />
            Sync starten
          </Link>
        </Button>
      </AdminHeader>

      {failedSyncs.length > 0 && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center gap-4 rounded-md border border-danger/30 bg-danger-subtle p-4"
        >
          <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />
          <p className="flex-1 text-sm">
            <strong className="font-medium text-danger">
              {failedSyncs.length} Lieferanten-Sync fehlgeschlagen
            </strong>
            <span className="mt-0.5 block text-xs text-fg-muted">
              {failedSyncs.map((s) => s.name).join(', ')} — Bestände sind veraltet.
            </span>
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/admin/inventar">Prüfen</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Umsatz"
          value={formatEur(kpi.revenueCents)}
          sub={`${kpi.orderCount} Bestellungen · ${kpi.realOrderCount} echt`}
        />
        <StatTile
          label="Deckungsbeitrag"
          value={formatEur(kpi.marginCents)}
          sub={`${kpi.marginPct.toFixed(1)} % vom Umsatz`}
          tone="accent"
        />
        <StatTile
          label="Ø Bestellwert"
          value={formatEur(kpi.averageOrderCents)}
          sub={`${kpi.openOrders} offen`}
        />
        <StatTile
          label="Kritischer Bestand"
          value={String(kpi.lowStock + kpi.outOfStock)}
          sub={`${kpi.outOfStock} vergriffen · ${kpi.lowStock} knapp`}
          tone={kpi.outOfStock > 0 ? 'danger' : 'warning'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Letzte Bestellungen"
          description="Blind-Dropshipping-Routing wird beim Zahlungseingang automatisch berechnet."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/dropshipping">
                Alle
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          }
        >
          <TableWrap>
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-fg-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Bestellung</th>
                  <th scope="col" className="px-5 py-3 font-medium">Kunde</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Wert</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((order) => {
                  const totals = orderTotals(order);
                  return (
                    <tr key={order.id}>
                      <th scope="row" className="px-5 py-3 text-left font-mono text-xs font-normal">
                        {order.id}
                      </th>
                      <td className="px-5 py-3">
                        <span className="block truncate text-xs">{order.customer.name}</span>
                        <span className="font-mono text-2xs text-fg-subtle">
                          {order.customer.postcode} {order.customer.city}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular">
                        {formatEur(totals.subtotalCents)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular text-accent">
                        {totals.marginPct.toFixed(0)} %
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Lieferanten"
            description="Bestände und EK-Preise werden per SFTP oder REST synchronisiert."
          >
            <ul className="divide-y divide-line">
              {SUPPLIERS.map((supplier) => (
                <li key={supplier.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{supplier.name}</p>
                    <p className="font-mono text-2xs text-fg-subtle">
                      {supplier.transport.toUpperCase()} · {supplier.scheduleLabel} ·{' '}
                      {supplier.itemsTracked} Artikel
                    </p>
                  </div>
                  <StatusPill status={supplier.lastSyncStatus} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="pSEO-Status"
            description={`${PSEO_TEMPLATES.filter((t) => t.enabled).length} von ${PSEO_TEMPLATES.length} Templates aktiv.`}
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/pseo">
                  Verwalten
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            }
          >
            <div className="p-5">
              <p className="font-mono text-3xl font-medium tabular text-accent">
                {totalPseoRoutes()}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">generierte Landingpages</p>
              <ul className="mt-4 space-y-2">
                {PSEO_TEMPLATES.map((template) => (
                  <li key={template.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-fg-muted">{template.name}</span>
                    <span className="shrink-0 font-mono tabular text-fg-subtle">
                      {template.enabled ? template.routeCount() : 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Nachbestellen"
          description="Artikel mit kritischem oder erschöpftem Bestand."
        >
          <ul className="divide-y divide-line">
            {criticalStock.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{product.name}</p>
                  <p className="font-mono text-2xs text-fg-subtle">
                    EK {formatEur(product.costCents)} · VK {formatEur(product.priceCents)}
                  </p>
                </div>
                <span
                  className={
                    product.stock <= 0
                      ? 'shrink-0 font-mono text-sm tabular text-danger'
                      : 'shrink-0 font-mono text-sm tabular text-warning'
                  }
                >
                  {product.stock} Stk.
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Letzte Altersnachweise"
          description="Aufbewahrungspflichtig nach §10 JuSchG."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/altersnachweis">
                Alle
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          }
        >
          {verifications.length === 0 ? (
            <p className="p-5 text-sm text-fg-muted">
              Noch keine Prüfungen protokolliert. Schließe eine Testbestellung ab, um den Log zu
              füllen.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {verifications.map((entry) => (
                <li key={entry.reference} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs">{entry.reference}</p>
                    <p className="text-2xs text-fg-subtle">
                      {entry.provider === 'postident' ? 'PostIdent' : 'SOFORT Ident'} ·{' '}
                      {new Date(entry.checkedAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <StatusPill status={entry.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Dropshipping-Warteschlange"
        description="Bestellungen, für die noch kein Lieferschein erzeugt wurde."
        className="mt-6"
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/dropshipping">
              <PackageSearch className="size-4" aria-hidden />
              Lieferscheine
            </Link>
          </Button>
        }
      >
        <ul className="divide-y divide-line">
          {orders.filter((o) => o.status === 'paid').map((order) => {
            const routing = orderRouting(order);
            return (
              <li key={order.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                <span className="font-mono text-xs">{order.id}</span>
                <span className="text-xs text-fg-muted">{order.customer.name}</span>
                <span className="ml-auto flex flex-wrap gap-1.5">
                  {routing.assignments.map((assignment) => (
                    <span
                      key={assignment.supplier.id}
                      className="rounded-sm border border-line bg-white/[0.04] px-2 py-0.5 text-2xs text-fg-subtle"
                    >
                      {assignment.supplier.name.split(' ')[0]}
                      {assignment.blind && <span className="ml-1 text-accent">blind</span>}
                    </span>
                  ))}
                  {routing.unroutable.length > 0 && (
                    <span className="rounded-sm border border-warning/30 bg-warning-subtle px-2 py-0.5 text-2xs text-warning">
                      {routing.unroutable.length} manuell
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
