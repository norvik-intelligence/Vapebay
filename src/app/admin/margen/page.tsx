import type { Metadata } from 'next';
import { Info } from 'lucide-react';

import { MARKUP_RULE_SET, marginTable } from '@/lib/admin/pricing';
import { PRODUCTS } from '@/lib/data/catalog';
import { formatEur } from '@/lib/utils';
import { AdminHeader, Panel, StatTile, TableWrap } from '@/components/admin/primitives';
import { MarkupSimulator } from '@/components/admin/markup-simulator';

export const metadata: Metadata = { title: 'Margen & Aufschlag' };

export default function MarginsPage() {
  const rows = marginTable();

  const catalogRevenue = PRODUCTS.reduce((sum, p) => sum + p.priceCents, 0);
  const catalogCost = PRODUCTS.reduce((sum, p) => sum + p.costCents, 0);
  const blendedMargin = ((catalogRevenue - catalogCost) / catalogRevenue) * 100;
  const bestKind = [...rows].sort((a, b) => b.grossMarginPct - a.grossMarginPct)[0];

  return (
    <>
      <AdminHeader
        title="Margen & Aufschlagregeln"
        description="Verkaufspreise werden nach jedem Lieferanten-Sync automatisch aus dem Einkaufspreis abgeleitet. Eine Regel je Warengruppe, jeweils mit Preisuntergrenze und Charm-Pricing."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Mischmarge"
          value={`${blendedMargin.toFixed(1)} %`}
          sub="über das gesamte Sortiment"
          tone="accent"
        />
        <StatTile label="Aktive Regeln" value={String(MARKUP_RULE_SET.filter((r) => r.active).length)} sub={`von ${MARKUP_RULE_SET.length}`} />
        <StatTile label="Beste Warengruppe" value={bestKind.label.split(' ')[0]} sub={`${bestKind.grossMarginPct.toFixed(0)} % Marge`} />
        <StatTile label="Kalkulierte Artikel" value={String(PRODUCTS.length)} sub="automatisch bepreist" />
      </div>

      <div className="mt-6 flex gap-3 rounded-md border border-line bg-white/[0.02] p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p className="text-xs leading-relaxed text-fg-muted">
          <strong className="font-medium text-fg">Aufschlag ist nicht gleich Marge.</strong> Ein
          Aufschlag von 70 % auf den EK ergibt eine Marge von 41 % vom Verkaufspreis. Beide Werte
          stehen deshalb nebeneinander in der Tabelle — eine Preisuntergrenze, die gegen die falsche
          Zahl gesetzt wird, kostet in jeder Bestellung Geld.
        </p>
      </div>

      <Panel
        title="Aufschlagregeln"
        description="Basispunkte statt Prozent: 2000 = +20 %. Ganzzahlen verhindern Rundungsdrift über tausende Artikel."
        className="mt-6"
      >
        <TableWrap>
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-fg-subtle">
                <th scope="col" className="px-5 py-3 font-medium">Warengruppe</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Aufschlag</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Marge</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Beispiel EK</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Beispiel VK</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">DB / Stück</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.kind}>
                  <th scope="row" className="px-5 py-3 text-left font-normal">
                    <span className="block text-xs">{row.label}</span>
                    <span className="font-mono text-2xs text-fg-subtle">{row.kind}</span>
                  </th>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular">
                    +{(row.markupBps / 100).toFixed(0)} %
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular text-accent">
                    {row.grossMarginPct.toFixed(1)} %
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular text-fg-muted">
                    {formatEur(row.exampleCostCents)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular">
                    {formatEur(row.exampleRetailCents)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular">
                    {formatEur(row.exampleProfitCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <section className="mt-8" aria-labelledby="simulator-title">
        <h2 id="simulator-title" className="text-lg font-semibold tracking-tight">
          Regel-Simulator
        </h2>
        <p className="measure mt-2 text-sm text-fg-muted">
          Aufschlag verschieben und sehen, was mit Verkaufspreis, Marge und Deckungsbeitrag
          passiert — bevor die Regel scharf geschaltet wird.
        </p>
        <div className="mt-5">
          <MarkupSimulator rules={MARKUP_RULE_SET} />
        </div>
      </section>

      <Panel title="Begründungen" description="Warum die Aufschläge so gesetzt sind." className="mt-8">
        <ul className="divide-y divide-line">
          {MARKUP_RULE_SET.map((rule) => (
            <li key={rule.kind} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-sm font-medium">{rule.label}</h3>
                <span className="font-mono text-2xs text-accent">
                  +{(rule.markupBps / 100).toFixed(0)} %
                </span>
                <span className="font-mono text-2xs text-fg-subtle">
                  Untergrenze {formatEur(rule.floorCents)}
                </span>
              </div>
              <p className="measure mt-2 text-xs leading-relaxed text-fg-muted">{rule.rationale}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
