import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * E2E-Suite gegen den echten Produktions-Build.
 *
 * `webServer` baut nicht selbst — `npm run build` muss vorher gelaufen sein.
 * Absichtlich: der Build dauert Minuten, und eine Suite, die ihn implizit
 * anstößt, wird aus Ungeduld nicht mehr ausgeführt.
 *
 * Die Tests laufen gegen eine eigene Datenbank (data/e2e.db), die das
 * globalSetup vor jedem Lauf frisch aufsetzt. Bestellungen aus Testläufen
 * landen damit nie in der Entwicklungs-DB.
 */

// Zugangsdaten NUR für die Testumgebung. Der Hash ist SHA-256("e2e-admin-passwort").
export const E2E_ADMIN_PASSWORD = 'e2e-admin-passwort';
const E2E_ADMIN_PASSWORD_HASH =
  '24affdc433366a514e38497833814124806285211b8803e92425d2cda818569d';
const E2E_SESSION_SECRET = 'e2e-session-secret-nur-fuer-tests';

// In der CI/Sandbox liegt Chromium unter /opt/pw-browsers; auf Entwickler-
// maschinen findet Playwright seinen eigenen Browser-Download.
const chromiumPath = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  // Die Specs teilen sich eine DB mit echten Bestand-Decrements — parallele
  // Worker würden sich gegenseitig den Lagerbestand wegkaufen.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:3199',
    trace: 'retain-on-failure',
    ...(existsSync(chromiumPath) ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx next start -p 3199',
    url: 'http://localhost:3199/api/health',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: './data/e2e.db',
      ADMIN_SESSION_SECRET: E2E_SESSION_SECRET,
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD_HASH,
    },
  },
});
