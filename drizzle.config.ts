import type { Config } from 'drizzle-kit';

/**
 * SQLite is the default driver: a €10 Hetzner CX23 has 4GB total and the Node
 * process is capped at 512MB — running Postgres alongside would eat half the
 * box for a catalog that fits in a 12MB file. Swap DB_DRIVER=pg when the
 * catalog outgrows single-writer throughput (see README "Scaling up").
 */
export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './data/vapebay.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
