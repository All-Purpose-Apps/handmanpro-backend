import mongoose from 'mongoose';
import { LRUCache } from 'lru-cache';

const CONNECTION_TTL_MS = 1000 * 60 * 10; // 10 minutes

const connectionCache = new LRUCache({
  max: 200,
  ttl: CONNECTION_TTL_MS,
  dispose: (value) => value.connection.close(),
});
const connectionPromises = {};

export const getTenantDb = async (tenantId) => {
  if (!tenantId) {
    console.error('[getTenantDb] Tenant ID is required');
    throw new Error('Tenant ID is required');
  }

  const cached = connectionCache.get(tenantId);
  if (cached) {
    connectionCache.set(tenantId, cached); // Refresh LRU position
    return cached.connection;
  }

  if (connectionPromises[tenantId]) {
    return connectionPromises[tenantId];
  }

  const uri = `${process.env.MONGODB_URI_BASE}_${tenantId}`;

  const connection = mongoose.createConnection(uri);

  const connectPromise = new Promise((resolve, reject) => {
    connection.once('open', () => resolve(connection));
    connection.on('error', reject);
  });

  connectionPromises[tenantId] = connectPromise;

  const readyConnection = await connectPromise;

  connectionCache.set(tenantId, { connection: readyConnection });
  delete connectionPromises[tenantId];

  return readyConnection;
};
