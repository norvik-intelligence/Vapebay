'use client';

import * as React from 'react';
import { FileText, Printer } from 'lucide-react';

import { buildPackingSlip, type RoutingLine } from '@/lib/admin/dropshipping';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Branded packing slip for blind dropshipping.
 *
 * Rendered as print-optimised HTML and exported via the browser's own
 * print-to-PDF rather than a server-side PDF library. On a 512MB container,
 * headless Chrome or a full PDF toolchain is the single largest memory line
 * item in the stack — and the output here is one A4 page of text. If batch
 * generation is ever needed (100 slips into one file for a warehouse run),
 * that is the point to add @react-pdf/renderer on a worker, not before.
 *
 * The slip carries NO prices. A wholesale invoice reaching the end customer
 * is how a dropshipper loses that customer to their own supplier.
 */
export function PackingSlipDialog({
  orderId,
  supplierId,
  recipient,
  lines,
}: {
  orderId: string;
  supplierId: string;
  recipient: { name: string; street: string; postcode: string; city: string; country: string };
  lines: RoutingLine[];
}) {
  const slip = React.useMemo(
    () => buildPackingSlip({ orderId, supplierId, recipient, lines }),
    [orderId, supplierId, recipient, lines],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <FileText className="size-4" aria-hidden />
          Lieferschein
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <div className="p-6 print:p-0">
          <div className="print:hidden">
            <DialogTitle>Lieferschein {slip.documentNumber}</DialogTitle>
            <DialogDescription className="mt-2">
              {slip.blind
                ? 'Blind-Dropshipping: Das Dokument trägt ausschließlich unseren Absender. Der Lieferant druckt es unverändert bei.'
                : 'Achtung: Dieser Lieferant unterstützt kein Blind-Dropshipping. Die Ware geht ins eigene Lager und wird von uns weiterversendet.'}
            </DialogDescription>
            <Button size="sm" className="mt-4" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Als PDF drucken
            </Button>
            <div className="hairline my-6" />
          </div>

          {/* The printable document itself */}
          <article
            id="packing-slip"
            className="rounded-md border border-line bg-white p-8 text-[#0d1117] print:rounded-none print:border-0 print:p-0"
          >
            <header className="flex items-start justify-between gap-8 border-b-2 border-[#0d1117] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-sm bg-[#0d1117] font-mono text-sm text-white">
                    V
                  </span>
                  <span className="text-lg font-semibold tracking-tight">Vapebay</span>
                </div>
                <address className="mt-3 text-[11px] not-italic leading-relaxed text-[#4c545f]">
                  {slip.sender.company}
                  <br />
                  {slip.sender.street}
                  <br />
                  {slip.sender.city}
                  <br />
                  {slip.sender.country}
                  <br />
                  USt-IdNr. {slip.sender.vatId}
                </address>
              </div>

              <div className="text-right">
                <h2 className="text-base font-semibold uppercase tracking-wide">Lieferschein</h2>
                <dl className="mt-3 space-y-0.5 text-[11px] leading-relaxed text-[#4c545f]">
                  <div className="flex justify-end gap-2">
                    <dt>Nr.</dt>
                    <dd className="font-mono text-[#0d1117]">{slip.documentNumber}</dd>
                  </div>
                  <div className="flex justify-end gap-2">
                    <dt>Bestellung</dt>
                    <dd className="font-mono text-[#0d1117]">{slip.orderId}</dd>
                  </div>
                  <div className="flex justify-end gap-2">
                    <dt>Datum</dt>
                    <dd className="font-mono text-[#0d1117]">
                      {new Date(slip.issuedAt).toLocaleDateString('de-DE')}
                    </dd>
                  </div>
                </dl>
              </div>
            </header>

            <section className="mt-6">
              <p className="text-[10px] uppercase tracking-wide text-[#6b7480]">Lieferanschrift</p>
              <address className="mt-1.5 text-sm not-italic leading-relaxed">
                {slip.recipient.name}
                <br />
                {slip.recipient.street}
                <br />
                {slip.recipient.postcode} {slip.recipient.city}
                <br />
                {slip.recipient.country}
              </address>
            </section>

            <table className="mt-7 w-full border-collapse text-sm">
              <caption className="sr-only">Positionen des Lieferscheins</caption>
              <thead>
                <tr className="border-b border-[#c9ced6] text-left text-[10px] uppercase tracking-wide text-[#6b7480]">
                  <th scope="col" className="pb-2 pr-3 font-medium">Pos.</th>
                  <th scope="col" className="pb-2 pr-3 font-medium">Artikel</th>
                  <th scope="col" className="pb-2 pr-3 font-medium">SKU</th>
                  <th scope="col" className="pb-2 text-right font-medium">Menge</th>
                </tr>
              </thead>
              <tbody>
                {slip.lines.map((line, index) => (
                  <tr key={line.sku} className="border-b border-[#e6e9ee]">
                    <td className="py-2.5 pr-3 font-mono text-xs text-[#6b7480]">{index + 1}</td>
                    <td className="py-2.5 pr-3">
                      <span className="block text-xs">{line.name}</span>
                      {line.note && (
                        <span className="block text-[10px] text-[#6b7480]">{line.note}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-[#6b7480]">{line.sku}</td>
                    <td className="py-2.5 text-right font-mono text-xs">{line.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 text-[10px] text-[#6b7480]">
              Keine Preisangaben — dieser Lieferschein ist keine Rechnung. Die Rechnung erhält der
              Empfänger separat per E-Mail.
            </p>

            <footer className="mt-10 border-t border-[#c9ced6] pt-4">
              <p className="text-[10px] leading-relaxed text-[#4c545f]">{slip.legalNotice}</p>
              <p className="mt-3 text-[10px] text-[#6b7480]">
                Fragen zur Lieferung? {slip.sender.supportEmail} · Bitte wende dich ausschließlich an
                Vapebay, nicht an den Versanddienstleister.
              </p>
            </footer>
          </article>

          {/* Internal routing data — screen only, never printed. */}
          <div className="mt-5 rounded-md border border-line bg-white/[0.02] p-4 print:hidden">
            <p className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">
              Intern (nicht auf dem Ausdruck)
            </p>
            <dl className="mt-2 space-y-1 font-mono text-2xs text-fg-muted">
              <div className="flex gap-2">
                <dt className="text-fg-subtle">Lieferant</dt>
                <dd>{slip.fulfilledBy.supplierName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-fg-subtle">Referenz</dt>
                <dd>{slip.fulfilledBy.internalReference}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-fg-subtle">Blind</dt>
                <dd>{slip.blind ? 'ja' : 'nein'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
