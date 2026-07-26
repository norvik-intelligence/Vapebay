'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

import { applyRule, type MarkupRule } from '@/lib/admin/pricing';
import { formatEur } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/misc';

/**
 * Markup simulator.
 *
 * Saving writes to `markup_rules`; it does not reprice the live catalog,
 * because prices are derived at build time. The button copy and the toast both
 * say that outright — a merchant who thinks they just changed 178 live prices
 * when they did not is worse off than one who has to run a sync.
 */
export function MarkupSimulator({ rules }: { rules: MarkupRule[] }) {
  const [kind, setKind] = React.useState(rules[0]?.kind ?? 'nicsalt');
  const [costEuros, setCostEuros] = React.useState('2.49');
  const [markupPct, setMarkupPct] = React.useState(
    String((rules[0]?.markupBps ?? 7000) / 100),
  );
  const [charm, setCharm] = React.useState(true);
  const [monthlyUnits, setMonthlyUnits] = React.useState('850');

  const base = rules.find((r) => r.kind === kind) ?? rules[0];

  const costCents = Math.max(0, Math.round(Number(costEuros.replace(',', '.')) * 100) || 0);
  const bps = Math.max(0, Math.round(Number(markupPct.replace(',', '.')) * 100) || 0);
  const units = Math.max(0, Math.round(Number(monthlyUnits) || 0));

  const simulated: MarkupRule = { ...base, markupBps: bps, charmPricing: charm };
  const retailCents = applyRule(costCents, simulated);
  const profitCents = retailCents - costCents;
  const marginPct = retailCents === 0 ? 0 : (profitCents / retailCents) * 100;

  const currentRetail = applyRule(costCents, base);
  const deltaCents = retailCents - currentRetail;
  const dirty = bps !== base.markupBps || charm !== base.charmPricing;

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/markup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productKind: kind,
          markupBps: bps,
          floorCents: base.floorCents,
          charmPricing: charm,
          active: base.active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
      return data as { note: string };
    },
    onSuccess: (data) => toast.success('Regel gespeichert', { description: data.note }),
    onError: (error: Error) => toast.error('Nicht gespeichert', { description: error.message }),
  });

  return (
    <div className="glass grid gap-6 rounded-lg p-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Field label="Warengruppe" htmlFor="sim-kind">
          <select
            id="sim-kind"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as MarkupRule['kind'];
              setKind(next);
              const rule = rules.find((r) => r.kind === next);
              if (rule) setMarkupPct(String(rule.markupBps / 100));
            }}
            className="h-11 w-full rounded-md border border-line bg-bg-elevated px-3.5 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            {rules.map((rule) => (
              <option key={rule.kind} value={rule.kind}>
                {rule.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Einkaufspreis (netto)" htmlFor="sim-cost" hint="in Euro, z. B. 2.49">
          <Input
            id="sim-cost"
            inputMode="decimal"
            value={costEuros}
            onChange={(e) => setCostEuros(e.target.value)}
          />
        </Field>

        <Field
          label="Aufschlag in Prozent"
          htmlFor="sim-markup"
          hint={`Aktuell hinterlegt: +${(base.markupBps / 100).toFixed(0)} %`}
        >
          <Input
            id="sim-markup"
            inputMode="decimal"
            value={markupPct}
            onChange={(e) => setMarkupPct(e.target.value)}
          />
        </Field>

        <Field label="Absatz pro Monat" htmlFor="sim-units" hint="Für die Hochrechnung">
          <Input
            id="sim-units"
            inputMode="numeric"
            value={monthlyUnits}
            onChange={(e) => setMonthlyUnits(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-white/[0.02] p-4">
          <span>
            <span className="block text-sm font-medium">Charm-Pricing</span>
            <span className="mt-0.5 block text-xs text-fg-subtle">
              Rundet auf .49 oder .99 statt auf den exakten Wert
            </span>
          </span>
          <Switch checked={charm} onCheckedChange={setCharm} aria-label="Charm-Pricing" />
        </div>
      </div>

      <div className="rounded-md border border-line bg-white/[0.02] p-5">
        <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">
          Simuliertes Ergebnis
        </p>

        <p className="mt-3 font-mono text-4xl font-medium tabular text-accent">
          {formatEur(retailCents)}
        </p>
        <p className="mt-1 text-xs text-fg-subtle">Verkaufspreis inkl. 19 % USt.</p>

        {deltaCents !== 0 && (
          <p className="mt-3 font-mono text-xs tabular text-fg-muted">
            {deltaCents > 0 ? '+' : '−'}
            {formatEur(Math.abs(deltaCents))} gegenüber der aktiven Regel (
            {formatEur(currentRetail)})
          </p>
        )}

        <dl className="mt-6 divide-y divide-line border-t border-line" aria-live="polite">
          {[
            ['Deckungsbeitrag / Stück', formatEur(profitCents)],
            ['Marge vom VK', `${marginPct.toFixed(1)} %`],
            ['Aufschlag auf EK', `+${(bps / 100).toFixed(0)} %`],
            ['Preisuntergrenze', formatEur(base.floorCents)],
            ['DB pro Monat', formatEur(profitCents * units)],
            ['Umsatz pro Monat', formatEur(retailCents * units)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-xs text-fg-muted">{label}</dt>
              <dd className="font-mono text-sm tabular">{value}</dd>
            </div>
          ))}
        </dl>

        {retailCents <= costCents && costCents > 0 && (
          <p role="alert" className="mt-4 text-xs font-medium text-danger">
            Der Verkaufspreis liegt nicht über dem Einkaufspreis — diese Regel würde Verlust
            erzeugen.
          </p>
        )}

        <Button
          size="sm"
          className="mt-5 w-full"
          disabled={!dirty || retailCents <= costCents}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {!save.isPending && <Save className="size-4" aria-hidden />}
          Regel speichern
        </Button>
        <p className="mt-2 text-2xs leading-relaxed text-fg-subtle">
          Speichern schreibt die Regel in die Datenbank. Die Verkaufspreise werden beim nächsten
          Lieferanten-Sync oder Build daraus neu abgeleitet — bestehende Preise ändern sich nicht
          sofort.
        </p>
      </div>
    </div>
  );
}
