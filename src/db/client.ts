import { createClient } from '@libsql/client';

export type DatabaseClient = ReturnType<typeof createClient>;

let clientInstance: DatabaseClient | undefined;

export function getDatabaseClient(): DatabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN is not set');
  }

  clientInstance = createClient({ url, authToken });

  return clientInstance;
}
