import { afterAll, mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { logger } from "../src/config/logger";
import * as schema from "../src/db/schema";

/**
 * Ephemeral in-memory PostgreSQL client for testing.
 *
 * @internal
 */
const client = new PGlite();

/**
 * Drizzle ORM instance connected to the ephemeral PGlite database.
 *
 * @internal
 */
export const testDb = drizzle(client, { schema });

mock.module("../src/db/index.ts", () => ({
  db: testDb,
}));

mock.module("../src/modules/notifications/service.ts", () => ({
  NotificationService: {
    sendFeatureCompletedEmail: async (clientEmail: string, featureTitle: string): Promise<void> => {
      logger.info(`[Mock Notification] Email sent to ${clientEmail} for feature: ${featureTitle}`);
    },
  },
}));

/**
 * Initializes the test database by running migrations.
 *
 * @remarks
 * This function must be called before running tests that interact with the database.
 * Ensure that `bun run db:generate` has been executed previously so the `migrations` folder
 * exists.
 *
 * @public
 */
export async function setupTestDb() {
  await migrate(testDb, { migrationsFolder: "./src/db/migrations" });
}

/**
 * Clears all data from the test database tables.
 *
 * @public
 */
export async function clearTestDb() {
  await testDb.delete(schema.idempotencyKeys);
  await testDb.delete(schema.payments);
  await testDb.delete(schema.features);
  await testDb.delete(schema.users);
}

/**
 * Closes the PGlite client after all tests have completed.
 *
 * @remarks
 * This ensures that all active event loop handles are cleaned up,
 * preventing the test runner from hanging or exiting with a non-zero code.
 */
afterAll(async () => {
  await client.close();
});
