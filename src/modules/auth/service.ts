import { eq } from "drizzle-orm";
import { db } from "../../db";
import { revokedTokens, users } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../shared/crypto";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../shared/errors";

/**
 * Handles business logic for user authentication and registration.
 *
 * @remarks
 * This service interacts directly with the database to create new users,
 * verify credentials, and retrieve user profiles.
 *
 * @public
 */
export abstract class AuthService {
  /**
   * Registers a new client account in the system.
   *
   * @param email - The email address of the new user.
   * @param passwordRaw - The plain-text password provided by the user.
   * @returns The newly created user record.
   *
   * @throws {@link ConflictError}
   * Thrown if the email is already registered.
   *
   * @public
   */
  static async register(email: string, passwordRaw: string) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictError("Email is already registered");
    }

    const passwordHash = await hashPassword(passwordRaw);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: "CLIENT",
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    return newUser;
  }

  /**
   * Authenticates a user using their email and password.
   *
   * @param email - The registered email address of the user.
   * @param passwordRaw - The plain-text password to verify.
   * @returns The authenticated user record.
   *
   * @throws {@link UnauthorizedError}
   * Thrown if the user does not exist or the password is incorrect.
   *
   * @public
   */
  static async login(email: string, passwordRaw: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await verifyPassword(passwordRaw, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Retrieves a user profile by their unique identifier.
   *
   * @param id - The unique identifier of the user to fetch.
   * @returns The matching user record.
   *
   * @throws {@link NotFoundError}
   * Thrown if the user does not exist.
   *
   * @public
   */
  static async getUserById(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Invalidates an active JSON Web Token.
   *
   * @remarks
   * This function inserts the provided token into the blocklist database table.
   * Subsequent authentication attempts using this token will be rejected.
   *
   * @param token - The JWT access token to revoke.
   * @returns A promise that resolves when the token is successfully revoked.
   *
   * @public
   */
  static async logout(token: string): Promise<void> {
    await db.insert(revokedTokens).values({ token }).onConflictDoNothing();
  }
}
