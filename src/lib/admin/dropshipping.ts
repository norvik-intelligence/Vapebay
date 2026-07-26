import { SUPPLIERS, supplierById, type Supplier } from './suppliers';
import { productById } from '@/lib/data/catalog';
import { brandBySlug } from '@/lib/data/brands';

/**
 * Blind-dropshipping order routing.
 *
 * "Blind" means the end customer never learns the supplier exists: the parcel
 * carries our sender address and our packing slip, and the slip carries no
 * prices at all — a wholesale invoice reaching the consumer is the fastest way
 * to lose them to the supplier directly.
 */

export interface RoutingLine {
  productId: string;
  brandSlug: string;
  qty: number;
}

export interface SupplierAssignment {
  supplier: Supplier;
  lines: RoutingLine[];
  leadTimeDays: number;
  blind: boolean;
}

export interface RoutingResult {
  assignments: SupplierAssignment[];
  /** Lines no configured supplier can fulfil — need manual handling. */
  unroutable: RoutingLine[];
  /** Slowest lead time across assignments; drives the delivery promise. */
  maxLeadTimeDays: number;
  /** Number of separate parcels the customer should expect. */
  parcelCount: number;
}

export function routeOrder(lines: RoutingLine[]): RoutingResult {
  const assignments = new Map<string, SupplierAssignment>();
  const unroutable: RoutingLine[] = [];

  for (const line of lines) {
    // Prefer a supplier that can ship blind, then the fastest lead time.
    // Splitting an order across two suppliers costs a second parcel, so a
    // slightly slower single-source supplier still wins on cost.
    const candidates = SUPPLIERS.filter((s) => s.brands.includes(line.brandSlug)).sort(
      (a, b) =>
        Number(b.supportsBlindDropship) - Number(a.supportsBlindDropship) ||
        a.leadTimeDays - b.leadTimeDays,
    );

    const supplier = candidates[0];
    if (!supplier) {
      unroutable.push(line);
      continue;
    }

    const existing = assignments.get(supplier.id);
    if (existing) {
      existing.lines.push(line);
    } else {
      assignments.set(supplier.id, {
        supplier,
        lines: [line],
        leadTimeDays: supplier.leadTimeDays,
        blind: supplier.supportsBlindDropship,
      });
    }
  }

  const list = [...assignments.values()];

  return {
    assignments: list,
    unroutable,
    maxLeadTimeDays: list.reduce((max, a) => Math.max(max, a.leadTimeDays), 0),
    parcelCount: list.length,
  };
}

// ── Packing slip ───────────────────────────────────────────────────────────

export interface PackingSlipLine {
  sku: string;
  name: string;
  qty: number;
  /** Deliberately no price — see the note on blind dropshipping above. */
  note: string;
}

export interface PackingSlip {
  documentNumber: string;
  issuedAt: string;
  /** The sender the parcel carries — ours, never the supplier's. */
  sender: {
    company: string;
    street: string;
    city: string;
    country: string;
    vatId: string;
    supportEmail: string;
  };
  recipient: {
    name: string;
    street: string;
    postcode: string;
    city: string;
    country: string;
  };
  fulfilledBy: {
    supplierId: string;
    supplierName: string;
    /** Internal only — stripped from the customer-facing render. */
    internalReference: string;
  };
  lines: PackingSlipLine[];
  orderId: string;
  blind: boolean;
  legalNotice: string;
}

export const SENDER = {
  company: 'Vapebay Handels GmbH',
  street: 'Speicherstraße 14',
  city: '60327 Frankfurt am Main',
  country: 'Deutschland',
  vatId: 'DE327104558',
  supportEmail: 'service@vapebay.de',
} as const;

export function buildPackingSlip(input: {
  orderId: string;
  supplierId: string;
  recipient: PackingSlip['recipient'];
  lines: RoutingLine[];
}): PackingSlip {
  const supplier = supplierById(input.supplierId);

  return {
    documentNumber: `LS-${input.orderId}-${input.supplierId.slice(-4).toUpperCase()}`,
    issuedAt: new Date().toISOString(),
    sender: { ...SENDER },
    recipient: input.recipient,
    fulfilledBy: {
      supplierId: input.supplierId,
      supplierName: supplier?.name ?? 'Unbekannt',
      internalReference: `${input.supplierId}/${input.orderId}`,
    },
    lines: input.lines.map((line) => {
      const product = productById(line.productId);
      const brand = brandBySlug(line.brandSlug);
      return {
        sku: line.productId,
        name: product?.name ?? line.productId,
        qty: line.qty,
        note: [brand?.name, product?.packSize && product.packSize > 1 ? `${product.packSize}er VE` : null]
          .filter(Boolean)
          .join(' · '),
      };
    }),
    orderId: input.orderId,
    blind: supplier?.supportsBlindDropship ?? false,
    legalNotice:
      'Dieses Produkt enthält Nikotin. Nikotin macht sehr schnell abhängig. Abgabe nur an Personen ab 18 Jahren. Das Alter des Empfängers wurde vor Versand nach §10 JuSchG geprüft.',
  };
}
