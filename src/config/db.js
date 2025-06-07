import mongoose from 'mongoose';

const CONNECTION_TTL_MS = 1000 * 60 * 10; // 10 minutes

const connectionCache = {}; // Will now store { connection, timeout }
const connectionPromises = {};

export const getTenantDb = async (tenantId) => {
  if (!tenantId) {
    console.error('[getTenantDb] Tenant ID is required');
    throw new Error('Tenant ID is required');
  }

  if (connectionCache[tenantId]) {
    clearTimeout(connectionCache[tenantId].timeout); // Reset TTL
    connectionCache[tenantId].timeout = setTimeout(() => {
      connectionCache[tenantId].connection.close();
      delete connectionCache[tenantId];
    }, CONNECTION_TTL_MS);

    return connectionCache[tenantId].connection;
  }

  if (connectionPromises[tenantId]) {
    return connectionPromises[tenantId];
  }

  const uri = `${process.env.MONGODB_URI_BASE}_${tenantId}`;

  const connectPromise = mongoose.createConnection(uri);

  connectionPromises[tenantId] = connectPromise;

  const connection = await connectPromise;

  const timeout = setTimeout(() => {
    connection.close();
    delete connectionCache[tenantId];
  }, CONNECTION_TTL_MS);

  connectionCache[tenantId] = { connection, timeout };
  delete connectionPromises[tenantId];

  return connection;
};
