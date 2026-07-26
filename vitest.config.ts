import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    // node, not jsdom: everything under test is a pure function. Booting a DOM
    // for the compatibility engine would triple the run time for nothing.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Die E2E-Specs gehören Playwright; Vitest darf sie nicht einsammeln.
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/db/seed.ts', 'src/lib/**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
