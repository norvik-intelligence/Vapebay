// Deliberately no `import 'server-only'` here: that package throws outside the
// react-server condition, and `npm run db:seed` runs this file in plain Node
// via tsx. The guard lives in the modules that server components import
// (see db/compliance.ts), which is where an accidental client import would
// actually originate.
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

let cached: Db | null = null;

/**
 * Lazy singleton connection.
 *
 * Lazy because `next build` prerenders pages in worker processes that must not
 * each open a write handle to the same SQLite file, and because a missing
 * database during CI should not fail the build — pages that need data call
 * `getDb()` only at request time.
 */
export function getDb(): Db {
  if (cached) return cached;

  const url = process.env.DATABASE_URL ?? './data/vapebay.db';
  mkdirSync(dirname(url), { recursive: true });

  const sqlite = new Database(url);

  // WAL lets readers proceed during a write, which is what makes single-file
  // SQLite viable for a storefront. NORMAL synchronous trades a theoretical
  // loss of the last transaction on power failure for ~10x write throughput —
  // acceptable for a catalog, and orders are written inside a transaction.
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  // 8MB page cache. Enough to hold the whole catalog hot; small enough to stay
  // well inside the 512MB container cap.
  sqlite.pragma('cache_size = -8000');
  sqlite.pragma('busy_timeout = 5000');

  cached = drizzle(sqlite, { schema });
  return cached;
}

export { schema };
