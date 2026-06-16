import { and, eq } from "drizzle-orm";
import { logger } from "../../config/logger";
import { db } from "../../db";
import { features, users } from "../../db/schema";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { NotificationService } from "../notifications/service";

/**
 * Handles business logic for feature backlog management.
 *
 * @remarks
 * Enforces optimistic locking during status updates to prevent race conditions.
 *
 * @public
 */
export abstract class FeatureService {
  /**
   * Creates a new feature in the backlog.
   *
   * @param payload - The feature details.
   * @returns The newly created feature.
   *
   * @public
   */
  static async createFeature(payload: {
    userId: string;
    title: string;
    description: string;
    price: number;
    deadline: Date;
  }) {
    const [newFeature] = await db.insert(features).values(payload).returning();
    return newFeature;
  }

  /**
   * Retrieves all features. If a userId is provided, filters by that user.
   *
   * @param userId - Optional user ID to filter features.
   * @returns A list of features.
   *
   * @public
   */
  static async getFeatures(userId?: string) {
    return userId
      ? db.query.features.findMany({
          where: eq(features.userId, userId),
        })
      : db.query.features.findMany();
  }

  /**
   * Retrieves a specific feature by ID.
   *
   * @param id - The feature ID.
   * @returns The feature record.
   *
   * @throws {@link NotFoundError}
   * Thrown if the feature does not exist.
   *
   * @public
   */
  static async getFeatureById(id: string) {
    const feature = await db.query.features.findFirst({
      where: eq(features.id, id),
    });

    if (!feature) {
      throw new NotFoundError("Feature not found");
    }

    return feature;
  }

  /**
   * Updates the status of a feature using optimistic locking.
   *
   * @param id - The feature ID.
   * @param status - The new status.
   * @param currentVersion - The current version number provided by the client.
   * @returns The updated feature.
   *
   * @throws {@link ConflictError}
   * Thrown if the version does not match (modified by another process).
   *
   * @public
   */
  static async updateFeatureStatus(
    id: string,
    status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "COMPLETED",
    currentVersion: number
  ) {
    const [updatedFeatures] = await db
      .update(features)
      .set({
        status,
        version: currentVersion + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(features.id, id), eq(features.version, currentVersion)))
      .returning();

    if (!updatedFeatures) {
      throw new ConflictError(
        "Feature update failed due to version conflict or feature not found. Please refresh and try again."
      );
    }

    if (status === "COMPLETED") {
      (async () => {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.id, updatedFeatures.userId),
          });
          if (user) {
            await NotificationService.sendFeatureCompletedEmail(user.email, updatedFeatures.title);
          }
        } catch (error) {
          logger.error("Failed to fetch user or dispatch notification", {
            error: error instanceof Error ? error.message : String(error),
            featureId: id,
          });
        }
      })();
    }

    return updatedFeatures;
  }
}
