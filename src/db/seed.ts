import { logger } from "../config/logger";
import { db } from "./index";
import { users } from "./schema";

/**
 * Seeds the database with initial required data.
 *
 * @remarks
 * This script creates the default DEVELOPER account required to manage features.
 * It uses `onConflictDoNothing` to ensure idempotency if run multiple times.
 *
 * @internal
 */
async function seed() {
  logger.info("🌱 Starting database seeding...");

  try {
    const devEmail = "developer@blackbox.local";
    const passwordHash = await Bun.password.hash("developer123");

    await db
      .insert(users)
      .values({
        email: devEmail,
        passwordHash,
        role: "DEVELOPER",
      })
      .onConflictDoNothing({ target: users.email });

    logger.info(`✅ Seed completed. Developer account created: ${devEmail}`);
  } catch (error) {
    logger.error("❌ Seeding failed:", { error });
  } finally {
    process.exit(0);
  }
}

seed();
