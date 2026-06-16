import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { hashPassword } from "../../shared/crypto";
import { ConflictError, NotFoundError } from "../../shared/errors";

/**
 * Handles business logic for user management.
 *
 * @remarks
 * This service interacts directly with the database to perform CRUD operations
 * on user records. It is intended to be used exclusively by users with the
 * DEVELOPER role.
 *
 * @public
 */
export abstract class UserService {
  /**
   * Retrieves all users from the database.
   *
   * @remarks
   * This function excludes sensitive information such as password hashes from
   * the returned dataset.
   *
   * @returns An array of user records.
   *
   * @public
   */
  static async getAll() {
    return db.query.users.findMany({
      columns: { passwordHash: false },
    });
  }

  /**
   * Retrieves a specific user by their unique identifier.
   *
   * @param id - The unique identifier of the user.
   * @returns The matching user record.
   *
   * @throws {@link NotFoundError}
   * Thrown when the user does not exist.
   *
   * @public
   */
  static async getById(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { passwordHash: false },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Creates a new user account.
   *
   * @param payload - The user creation data.
   * @param payload.email - The email address of the new user.
   * @param payload.passwordRaw - The plain-text password provided by the user.
   * @param payload.role - The role assigned to the new user.
   * @returns The newly created user record.
   *
   * @throws {@link ConflictError}
   * Thrown when the email address is already registered.
   *
   * @public
   */
  static async create(payload: {
    email: string;
    passwordRaw: string;
    role: "CLIENT" | "DEVELOPER";
  }) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, payload.email),
    });

    if (existing) {
      throw new ConflictError("Email already exists");
    }

    const passwordHash = await hashPassword(payload.passwordRaw);

    const [newUser] = await db
      .insert(users)
      .values({
        email: payload.email,
        passwordHash,
        role: payload.role,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return newUser;
  }

  /**
   * Updates an existing user account.
   *
   * @param id - The unique identifier of the user to update.
   * @param payload - The partial user data to update.
   * @param payload.email - The new email address.
   * @param payload.passwordRaw - The new plain-text password.
   * @param payload.role - The new role.
   * @returns The updated user record.
   *
   * @throws {@link NotFoundError}
   * Thrown when the user does not exist.
   *
   * @public
   */
  static async update(
    id: string,
    payload: {
      email?: string;
      passwordRaw?: string;
      role?: "CLIENT" | "DEVELOPER";
    }
  ) {
    await UserService.getById(id);

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.email) updateData.email = payload.email;
    if (payload.role) updateData.role = payload.role;
    if (payload.passwordRaw) {
      updateData.passwordHash = await hashPassword(payload.passwordRaw);
    }

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

    return updated;
  }

  /**
   * Deletes a user account.
   *
   * @param id - The unique identifier of the user to delete.
   * @returns An object containing the deleted user's ID.
   *
   * @throws {@link NotFoundError}
   * Thrown when the user does not exist.
   *
   * @public
   */
  static async delete(id: string) {
    await UserService.getById(id);
    await db.delete(users).where(eq(users.id, id));
    return { id };
  }
}
