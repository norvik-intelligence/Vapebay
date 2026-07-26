// Deliberately no `import 'server-only'` here: that package throws outside the
// react-server condition, and `npm run db:seed` runs this file in plain Node
// via tsx. The guard lives in the modules that server components import
// (see db/compliance.ts), which is where an accidental client import would
// actually originate.
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import * as schema from './schema';
import { seedDatabase } from './seed-data';

export type Db = BetterSQLite3Database<typeof schema>;

let cached: Db | null = null;

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // On Vercel the project directory is read-only; /tmp is the only writable
  // path. Ephemeral per lambda instance — exactly right for a preview, and
  // documented as such in the README.
  if (process.env.VERCEL) return '/tmp/vapebay.db';
  return './data/vapebay.db';
}

/**
 * Creates the schema and seeds the catalog when the database is empty.
 *
 * This is what lets a Vercel preview (fresh /tmp per cold start) and a fresh
 * Docker volume come up without a manual `db:push && db:seed` step. The DDL is
 * the drizzle-kit-generated migration, read from `drizzle/` — `npm run
 * db:generate` after a schema change keeps it current, and CI fails if the
 * folder drifts from the schema.
 *
 * Concurrency: better-sqlite3 is synchronous and Node is single-threaded, so
 * within one process the bootstrap runs to completion before any other request
 * touches the connection. Across processes (Vercel instances) each has its own
 * /tmp, so there is nothing to race.
 */
function bootstrap(sqlite: Database.Database, db: Db): void {
  const hasProducts = sqlite
    .prepare("select name from sqlite_master where type='table' and name='products'")
    .get();

  if (!hasProducts) {
    const migration = join(process.cwd(), 'drizzle', '0000_init.sql');
    if (!existsSync(migration)) {
      throw new Error(
        `Schema-Migration fehlt: ${migration}. Nach Schemaänderungen \`npm run db:generate\` ausführen und den drizzle/-Ordner committen.`,
      );
    }
    // drizzle-kit separates statements with breakpoint markers; exec() takes
    // the whole script once they are stripped.
    const ddl = readFileSync(migration, 'utf8').replaceAll('--> statement-breakpoint', ';');
    sqlite.exec(ddl);
  }

  const count = sqlite.prepare('select count(*) as c from products').get() as { c: number };
  if (count.c === 0) {
    seedDatabase(db);
  }
}

/**
 * Opens (and if necessary bootstraps) a database at the given path.
 *
 * Exported without the singleton so the bootstrap path is unit-testable
 * against ':memory:' — the cheapest way to catch a drizzle/-folder that
 * drifted from the schema before a Vercel cold start does.
 */
export function createDatabase(url: string): Db {
  if (url !== ':memory:') mkdirSync(dirname(url), { recursive: true });

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

  const db = drizzle(sqlite, { schema });
  bootstrap(sqlite, db);
  return db;
}

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
  cached = createDatabase(resolveDatabaseUrl());
  return cached;
}

export { schema };
