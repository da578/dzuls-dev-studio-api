import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { revokedTokens } from "../db/schema";
import { ForbiddenError, UnauthorizedError } from "./errors";

const jwtAccessSetup = jwt({
  name: "jwtAccess",
  secret: process.env.JWT_ACCESS_SECRET || "access_secret",
  exp: "15m",
});

const jwtRefreshSetup = jwt({
  name: "jwtRefresh",
  secret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  exp: "7d",
});

/**
 * Provides global authentication and authorization macros for the application.
 *
 * @remarks
 * This plugin configures JWT access and refresh token instances. It registers
 * two macros: `isAuth` for verifying the presence and validity of a Bearer token,
 * and `role` for enforcing Role-Based Access Control (RBAC).
 *
 * @public
 */
export const authPlugin = new Elysia({ name: "shared.auth" })
  .use(jwtAccessSetup)
  .use(jwtRefreshSetup)
  .macro({
    isAuth: {
      async resolve({ headers, jwtAccess }) {
        const authorization = headers.authorization;
        if (!authorization?.startsWith("Bearer ")) {
          throw new UnauthorizedError("Missing or invalid authorization header");
        }

        const token = authorization.match(/Bearer\s+([^,]+)/)?.[1];
        if (!token) {
          throw new UnauthorizedError("Token not found");
        }

        const isRevoked = await db.query.revokedTokens.findFirst({
          where: eq(revokedTokens.token, token),
        });

        if (isRevoked) {
          throw new UnauthorizedError("Token has been revoked. Please login again.");
        }

        const payload = await jwtAccess.verify(token);
        if (payload === false || !payload.sub) {
          throw new UnauthorizedError("Invalid or expired token");
        }

        return {
          user: {
            id: payload.sub as string,
            role: payload.role as "CLIENT" | "DEVELOPER",
          },
        };
      },
    },
  })
  .macro({
    role: (roles: ("CLIENT" | "DEVELOPER")[]) => ({
      beforeHandle(context: unknown) {
        const ctx = context as {
          user?: { id: string; role: "CLIENT" | "DEVELOPER" };
        };
        const user = ctx.user;
        if (!user) {
          throw new UnauthorizedError("Unauthorized");
        }
        if (!roles.includes(user.role)) {
          throw new ForbiddenError("Insufficient permissions");
        }
      },
    }),
  });
