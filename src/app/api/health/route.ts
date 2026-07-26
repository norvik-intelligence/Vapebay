import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Container healthcheck. Reports the RSS the process is actually using, which
 * is what matters on a 512MB cap — `heapUsed` alone hides the native
 * better-sqlite3 allocations that live outside V8.
 */
export async function GET() {
  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        externalMb: Math.round(memory.external / 1024 / 1024),
      },
      node: process.version,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
