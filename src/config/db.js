import mongoose from 'mongoose';

const CONNECTION_TTL_MS = 1000 * 60 * 10; // 10 minutes

const connectionCache = {}; // Will now store { connection, timeout }
const connectionPromises = {};

export const getTenantDb = async (tenantId) => {
  console.log('[getTenantDb] Called with tenantId:', tenantId);

  if (!tenantId) {
    console.error('[getTenantDb] Tenant ID is required');
    throw new Error('Tenant ID is required');
  }

  if (connectionCache[tenantId]) {
    clearTimeout(connectionCache[tenantId].timeout); // Reset TTL
    connectionCache[tenantId].timeout = setTimeout(() => {
      console.log(`[getTenantDb] Closing idle connection for tenantId: ${tenantId}`);
      connectionCache[tenantId].connection.close();
      delete connectionCache[tenantId];
    }, CONNECTION_TTL_MS);

    return connectionCache[tenantId].connection;
  }

  if (connectionPromises[tenantId]) {
    console.log(`[getTenantDb] Awaiting existing connection promise for tenantId: ${tenantId}`);
    return connectionPromises[tenantId];
  }

  const uri = `${process.env.MONGODB_URI_BASE}_${tenantId}`;
  console.log(`[getTenantDb] Creating new connection with URI: ${uri}`);

  const connectPromise = mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  connectionPromises[tenantId] = connectPromise;

  const connection = await connectPromise;

  const timeout = setTimeout(() => {
    console.log(`[getTenantDb] Closing idle connection for tenantId: ${tenantId}`);
    connection.close();
    delete connectionCache[tenantId];
  }, CONNECTION_TTL_MS);

  connectionCache[tenantId] = { connection, timeout };
  delete connectionPromises[tenantId];

  console.log(`[getTenantDb] New connection cached for tenantId: ${tenantId}`);
  return connection;
};
