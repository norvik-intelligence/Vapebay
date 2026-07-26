import type { Metadata } from 'next';
import { AlertTriangle, PackageSearch, Truck } from 'lucide-react';

import { allOrders, orderRouting, orderTotals } from '@/lib/admin/orders';
import { SENDER } from '@/lib/admin/dropshipping';
import { SUPPLIERS } from '@/lib/admin/suppliers';
import { formatEur } from '@/lib/utils';
import { AdminHeader, Panel, StatTile, StatusPill } from '@/components/admin/primitives';
import { PackingSlipDialog } from '@/components/admin/packing-slip';

export const metadata: Metadata = { title: 'Blind-Dropshipping' };

// The routing queue reads live orders. Without this the page is prerendered at
// build time and silently keeps showing the demo fixtures forever.
export const dynamic = 'force-dynamic';

export default function DropshippingPage() {
  const routings = allOrders().map((order) => ({
    order,
    routing: orderRouting(order),
    totals: orderTotals(order),
  }));

  const totalParcels = routings.reduce((sum, r) => sum + r.routing.parcelCount, 0);
  const splitOrders = routings.filter((r) => r.routing.parcelCount > 1).length;
  const manual = routings.filter((r) => r.routing.unroutable.length > 0).length;
  const blindShare =
    routings.reduce(
      (sum, r) => sum + r.routing.assignments.filter((a) => a.blind).length,
      0,
    ) / Math.max(totalParcels, 1);

  return (
    <>
      <AdminHeader
        title="Blind-Dropshipping & Routing"
        description="Jede bezahlte Bestellung wird automatisch auf den Lieferanten mit der kürzesten Lieferzeit geroutet, der die jeweilige Marke führt und blind versenden kann. Der Lieferschein trägt unseren Absender und keine Preise."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Offene Routings" value={String(routings.length)} sub={`${totalParcels} Pakete`} />
        <StatTile
          label="Blind-Anteil"
          value={`${Math.round(blindShare * 100)} %`}
          sub="der Pakete mit neutralem Versand"
          tone="accent"
        />
        <StatTile
          label="Splitbestellungen"
          value={String(splitOrders)}
          sub="mehr als ein Lieferant"
          tone={splitOrders > 0 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Manuell zu klären"
          value={String(manual)}
          sub="kein Lieferant zugeordnet"
          tone={manual > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <Panel
        title="Absenderdaten auf dem Lieferschein"
        description="Diese Angaben erscheinen auf jedem Blind-Dropshipping-Dokument. Der Lieferant taucht darauf nicht auf."
        className="mt-6"
      >
        <dl className="grid gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Firma', SENDER.company],
            ['Straße', SENDER.street],
            ['Ort', SENDER.city],
            ['Land', SENDER.country],
            ['USt-IdNr.', SENDER.vatId],
            ['Support', SENDER.supportEmail],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-2xs uppercase tracking-wide text-fg-subtle">{label}</dt>
              <dd className="mt-0.5 font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <section className="mt-8 space-y-4" aria-labelledby="queue-title">
        <h2 id="queue-title" className="text-lg font-semibold tracking-tight">
          Routing-Warteschlange
        </h2>

        {routings.map(({ order, routing, totals }) => (
          <article key={order.id} className="glass rounded-lg">
            <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line p-5">
              <span className="font-mono text-sm">{order.id}</span>
              <StatusPill status={order.status} />
              {order.isBusiness && (
                <span className="rounded-sm border border-line bg-white/[0.04] px-2 py-0.5 text-2xs text-fg-muted">
                  B2B
                </span>
              )}
              {order.isDemo && (
                <span className="rounded-sm border border-line bg-white/[0.04] px-2 py-0.5 text-2xs text-fg-subtle">
                  Demo
                </span>
              )}
              <span className="text-xs text-fg-muted">
                {order.customer.name} · {order.customer.postcode} {order.customer.city}
              </span>
              <span className="ml-auto flex items-center gap-4 font-mono text-2xs text-fg-subtle">
                <span>{totals.itemCount} Artikel</span>
                <span className="text-fg-muted">{formatEur(totals.subtotalCents)}</span>
                <span className="text-accent">DB {formatEur(totals.marginCents)}</span>
              </span>
            </header>

            <div className="divide-y divide-line">
              {routing.assignments.map((assignment) => (
                <div
                  key={assignment.supplier.id}
                  className="flex flex-wrap items-start gap-4 p-5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03]">
                    <Truck className="size-4 text-fg-muted" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="text-sm font-medium">{assignment.supplier.name}</p>
                      {assignment.blind ? (
                        <span className="rounded-sm border border-accent/30 bg-accent-subtle px-2 py-0.5 text-2xs font-medium text-accent">
                          Blind
                        </span>
                      ) : (
                        <span className="rounded-sm border border-warning/30 bg-warning-subtle px-2 py-0.5 text-2xs font-medium text-warning">
                          Über eigenes Lager
                        </span>
                      )}
                      <span className="font-mono text-2xs text-fg-subtle">
                        {assignment.leadTimeDays} Tag(e) Vorlauf
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1">
                      {assignment.lines.map((line) => {
                        const detail = order.lines.find((l) => l.productId === line.productId);
                        return (
                          <li
                            key={line.productId}
                            className="flex items-baseline gap-3 text-xs text-fg-muted"
                          >
                            <span className="font-mono tabular text-fg-subtle">{line.qty}×</span>
                            <span className="truncate">{detail?.name ?? line.productId}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <PackingSlipDialog
                    orderId={order.id}
                    supplierId={assignment.supplier.id}
                    recipient={{
                      name: order.customer.name,
                      street: 'Musterstraße 12',
                      postcode: order.customer.postcode,
                      city: order.customer.city,
                      country: order.customer.country === 'AT' ? 'Österreich' : 'Deutschland',
                    }}
                    lines={assignment.lines}
                  />
                </div>
              ))}

              {routing.unroutable.length > 0 && (
                <div className="flex items-start gap-3 p-5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      {routing.unroutable.length} Position(en) ohne Lieferant
                    </p>
                    <p className="measure mt-1 text-xs leading-relaxed text-fg-muted">
                      Kein konfigurierter Lieferant führt diese Marke. Entweder aus eigenem Bestand
                      versenden oder einen passenden Lieferanten anlegen.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <Panel
        title="Abdeckungsmatrix"
        description="Welcher Lieferant welche Marke blind versenden kann. Lücken hier werden zu manuellen Positionen oben."
        className="mt-8"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-fg-subtle">
                <th scope="col" className="px-5 py-3 font-medium">Lieferant</th>
                <th scope="col" className="px-5 py-3 font-medium">Marken</th>
                <th scope="col" className="px-5 py-3 font-medium">Warengruppen</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Blind</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Vorlauf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SUPPLIERS.map((supplier) => (
                <tr key={supplier.id}>
                  <th scope="row" className="px-5 py-3 text-left text-xs font-normal">
                    {supplier.name}
                  </th>
                  <td className="px-5 py-3 text-xs capitalize text-fg-muted">
                    {supplier.brands.map((b) => b.replace('-', ' ')).join(', ')}
                  </td>
                  <td className="px-5 py-3 text-xs text-fg-muted">{supplier.kinds.join(', ')}</td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={
                        supplier.supportsBlindDropship
                          ? 'font-mono text-xs text-accent'
                          : 'font-mono text-xs text-fg-subtle'
                      }
                    >
                      {supplier.supportsBlindDropship ? 'ja' : 'nein'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular text-fg-muted">
                    {supplier.leadTimeDays} T
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6 flex gap-3 rounded-md border border-line bg-white/[0.02] p-4">
        <PackageSearch className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
        <p className="text-xs leading-relaxed text-fg-subtle">
          Lieferscheine werden als druckoptimiertes HTML erzeugt und über den Browser-Druckdialog
          als PDF exportiert. Für Stapelverarbeitung — etwa 100 Scheine in einem Dokument für einen
          Lagerlauf — wäre eine serverseitige PDF-Pipeline sinnvoll; für den Einzelabruf wäre sie
          auf einem 512-MB-Container der größte Speicherposten im Stack.
        </p>
      </div>
    </>
  );
}
