import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { corsHeaders, corsPreflight } from '@/lib/cors';
import { readContent } from '@/lib/content';

// A health check must never be answered from a cache, or it reports the health
// of a past request rather than of this deployment right now.
export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

/**
 * GET /api/health
 *
 * Public liveness check. Deliberately does a *real* read — the published
 * `services` section, reporting how many services are offered — rather than
 * just returning `{ ok: true }`. Anything less would have answered 200 while
 * every content request was failing, which is exactly the outage this exists
 * to catch: the API process was up, but it could not reach MongoDB.
 *
 *   200 → { status: 'ok', servicesCount, latencyMs, … }
 *   503 → { status: 'error', error: 'database_unreachable', latencyMs }
 *
 * `latencyMs` is the useful number when the database is merely slow: a healthy
 * read is a few hundred ms, while a cluster that cannot be reached at all sits
 * at the driver's server-selection timeout (see lib/mongodb.ts).
 */
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const startedAt = Date.now();

  try {
    const db = await getDb();
    const services = await readContent(db, 'services');

    // The section holds a ServiceItem[]. A section that was never seeded reads
    // as null, which is a count of zero — not an error, so the check still
    // passes and the count itself tells you the content is missing.
    const published = Array.isArray(services.published) ? services.published : [];
    const draft = Array.isArray(services.draft) ? services.draft : [];

    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
        servicesCount: published.length,
        draftServicesCount: draft.length,
        neverPublished: services.neverPublished,
        publishedAt: services.publishedAt,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { headers }
    );
  } catch (err) {
    // Logged in full for the operator, but not returned: driver errors quote the
    // cluster hostnames (and sometimes the user) from MONGODB_URI, and this
    // endpoint is public.
    console.error('[health] database check failed', err);

    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        error: 'database_unreachable',
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { status: 503, headers }
    );
  }
}
