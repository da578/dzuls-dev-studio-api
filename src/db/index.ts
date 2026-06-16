import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;

/**
 * Initializes the database connection lazily.
 *
 * @remarks
 * This prevents the application from throwing errors during Cloudflare's
 * startup validation phase when environment variables are not yet bound.
 *
 * @returns The initialized Drizzle database instance.
 * @private
 */
function initDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in the environment variables.");
  }

  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * The global database connection instance.
 *
 * @remarks
 * Wrapped in a Proxy to enable lazy initialization. This is crucial for
 * serverless environments like Cloudflare Workers where environment variables
 * are only bound at runtime.
 *
 * @public
 */
export const db = new Proxy({} as unknown as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const database = initDb();
    return Reflect.get(database, prop, receiver);
  },
});
