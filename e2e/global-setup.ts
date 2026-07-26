import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

/**
 * Setzt vor jedem Lauf eine frische E2E-Datenbank auf.
 *
 * Frisch, nicht wiederverwendet: die Specs kaufen Bestand und legen
 * Bestellungen an. Ein zweiter Lauf gegen dieselbe DB würde andere
 * Bestandszahlen sehen und flaky werden — Determinismus schlägt Laufzeit.
 */
export default function globalSetup() {
  const db = './data/e2e.db';

  for (const suffix of ['', '-shm', '-wal']) {
    if (existsSync(db + suffix)) rmSync(db + suffix);
  }

  const env = { ...process.env, DATABASE_URL: db };
  execSync('npx drizzle-kit push --force', { env, stdio: 'pipe' });
  execSync('npx tsx src/lib/db/seed.ts', { env, stdio: 'pipe' });
}
