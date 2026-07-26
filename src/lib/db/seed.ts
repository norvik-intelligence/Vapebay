/**
 * CLI-Seed: `npm run db:seed`.
 *
 * `getDb()` bootstrapt eine leere Datenbank inzwischen selbst (Schema + Seed
 * beim ersten Zugriff). Dieser Befehl bleibt für den Fall, dass ein bereits
 * befüllter Bestand explizit auf den Katalogstand zurückgesetzt werden soll —
 * die Upserts frischen Preise, Bestände und Templates auf, ohne Bestellungen
 * oder das Compliance-Log anzufassen.
 */
import { getDb } from './index';
import { seedDatabase } from './seed-data';

const summary = seedDatabase(getDb());

console.log(
  `✓ Seed abgeschlossen: ${summary.brands} Marken, ${summary.devices} Geräte, ` +
    `${summary.flavours} Profile, ${summary.products} Produkte, ${summary.suppliers} Lieferanten.`,
);
