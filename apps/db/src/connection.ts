import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type DbInstance = LibSQLDatabase<typeof schema>;

export interface DbConfig {
  url: string;
  authToken?: string;
}

let dbInstance: DbInstance | null = null;

/**
 * Create a new database instance with the given configuration
 */
export function createDb(config: DbConfig): DbInstance {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });
  return drizzle(client, { schema });
}

/**
 * Initialize the global database instance
 * Must be called before using repositories
 */
export function initializeDb(config: DbConfig): void {
  dbInstance = createDb(config);
}

/**
 * Get the global database instance
 * Throws if not initialized
 */
export function getDb(): DbInstance {
  if (!dbInstance) {
    throw new Error(
      "Database not initialized. Call initializeDb() first with your configuration."
    );
  }
  return dbInstance;
}

// For backwards compatibility, export db as a getter
// This will throw if accessed before initialization
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    return getDb()[prop as keyof DbInstance];
  },
});
