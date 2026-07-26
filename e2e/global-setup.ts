import { existsSync, mkdirSync, rmSync } from 'node:fs';

/**
 * Setzt vor jedem Lauf eine frische E2E-Datenbank auf — durch Löschen.
 *
 * Kein `drizzle-kit push`, kein Seed-Skript: der Server bootstrapt eine leere
 * Datenbank beim ersten Zugriff selbst (Schema aus drizzle/, Seed aus dem
 * Katalog). Die Suite testet damit denselben Kaltstart-Pfad, den auch eine
 * Vercel-Instanz mit leerem /tmp durchläuft — der Bootstrap ist Testgegenstand,
 * nicht Test-Vorbereitung.
 *
 * Frisch, nicht wiederverwendet: die Specs kaufen Bestand und legen
 * Bestellungen an. Ein zweiter Lauf gegen dieselbe DB würde andere
 * Bestandszahlen sehen und flaky werden — Determinismus schlägt Laufzeit.
 */
export default function globalSetup() {
  const db = './data/e2e.db';
  mkdirSync('./data', { recursive: true });

  for (const suffix of ['', '-shm', '-wal']) {
    if (existsSync(db + suffix)) rmSync(db + suffix);
  }
}
