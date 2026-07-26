import 'server-only';
import { desc } from 'drizzle-orm';

import { getDb } from './index';
import { ageVerifications } from './schema';

/**
 * Age-verification audit log.
 *
 * Writes go to SQLite when a database is reachable and fall back to an
 * in-process ring buffer otherwise, so the demo and the CI build work without
 * a provisioned database. The fallback is explicitly *not* sufficient for
 * production compliance — §10 JuSchG requires durable retention — hence the
 * `persisted` flag returned to callers.
 */

export interface VerificationRecord {
  reference: string;
  provider: 'postident' | 'sofort';
  status: 'verified' | 'rejected' | 'pending';
  lastName: string;
  birthDate: string;
  checkedAt: string;
}

const MEMORY_LIMIT = 200;
const memory: VerificationRecord[] = [];

export function recordVerification(record: VerificationRecord): { persisted: boolean } {
  try {
    getDb().insert(ageVerifications).values(record).onConflictDoNothing().run();
    return { persisted: true };
  } catch {
    memory.unshift(record);
    if (memory.length > MEMORY_LIMIT) memory.length = MEMORY_LIMIT;
    return { persisted: false };
  }
}

export function listVerifications(limit = 50): VerificationRecord[] {
  try {
    return getDb()
      .select()
      .from(ageVerifications)
      .orderBy(desc(ageVerifications.checkedAt))
      .limit(limit)
      .all() as VerificationRecord[];
  } catch {
    return memory.slice(0, limit);
  }
}
