import { describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';

import { createDatabase } from './index';
import {
  ageVerifications,
  markupRules,
  orderLines,
  orders,
  products,
  pseoTemplates,
  suppliers,
} from './schema';
import { PRODUCTS } from '@/lib/data/catalog';

/**
 * Bootstrap-Guard.
 *
 * Der Runtime-Bootstrap liest das DDL aus `drizzle/0000_init.sql` — eine Datei,
 * die per `npm run db:generate` aus dem Schema erzeugt wird und driften kann.
 * Auf Vercel schlägt eine Drift erst beim Kaltstart der Preview fehl; dieser
 * Test schlägt stattdessen in der CI fehl. Er bootet eine In-Memory-Datenbank
 * über exakt denselben Pfad und fragt anschließend jede Tabelle ab, die der
 * Anwendungscode tatsächlich benutzt.
 */
describe('createDatabase bootstrap', () => {
  it('creates the schema and seeds the full catalog from nothing', () => {
    const db = createDatabase(':memory:');

    const productCount = db.select({ c: count() }).from(products).get();
    expect(productCount?.c).toBe(PRODUCTS.length);
  });

  it('leaves every table the app queries in a queryable state', () => {
    const db = createDatabase(':memory:');

    // Nicht nur "Tabelle existiert": jede Abfrage nutzt Spalten, auf die der
    // Anwendungscode zugreift — eine umbenannte Spalte fällt hier auf.
    expect(() =>
      db.select().from(orders).where(eq(orders.status, 'paid')).limit(1).all(),
    ).not.toThrow();
    expect(() => db.select().from(orderLines).limit(1).all()).not.toThrow();
    expect(() =>
      db.select().from(ageVerifications).where(eq(ageVerifications.status, 'verified')).all(),
    ).not.toThrow();
    expect(() => db.select().from(markupRules).all()).not.toThrow();
    expect(() => db.select().from(pseoTemplates).all()).not.toThrow();
    expect(() => db.select().from(suppliers).all()).not.toThrow();
  });

  it('seeds the markup rules and pSEO templates the admin reads', () => {
    const db = createDatabase(':memory:');

    expect(db.select().from(markupRules).all().length).toBeGreaterThan(0);
    expect(db.select().from(pseoTemplates).all().length).toBe(3);
  });

  it('is idempotent — opening an already-bootstrapped database changes nothing', () => {
    // Gleiche Datei zweimal öffnen: der zweite Bootstrap darf weder das Schema
    // erneut anlegen (CREATE TABLE würde werfen) noch den Bestand duplizieren.
    const path = `/tmp/vapebay-bootstrap-test-${Date.now()}.db`;
    const first = createDatabase(path);
    const before = first.select({ c: count() }).from(products).get()?.c;

    const second = createDatabase(path);
    const after = second.select({ c: count() }).from(products).get()?.c;

    expect(after).toBe(before);
  });
});
