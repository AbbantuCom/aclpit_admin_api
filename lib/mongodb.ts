import { MongoClient, Db } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Fail fast when the cluster is unreachable. The driver's 30s default means a
 * misconfigured deployment (bad URI, IP not allowlisted in Atlas) hangs every
 * request for half a minute before erroring, which is long enough to blow the
 * public site's 60s-per-page build budget rather than just returning an error.
 */
const options = { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 };

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  // Reused across hot reloads in dev and across invocations that share a warm
  // serverless instance in production; without it every request opens (and
  // leaks) a fresh connection pool.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect().catch((err) => {
      // Don't cache a rejected promise — the next request should retry instead
      // of replaying this failure forever.
      global._mongoClientPromise = undefined;
      throw err;
    });
  }
  return global._mongoClientPromise;
}

let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  const client = await getClientPromise();
  _db = client.db('agriverde');
  return _db;
}
