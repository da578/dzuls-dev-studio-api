import { Elysia, t } from "elysia";
import { authPlugin } from "../../shared/auth-plugin";
import { UnauthorizedError } from "../../shared/errors";
import { createSuccessResponse, StandardErrorResponses } from "../../shared/schema";
import { AuthModel } from "./model";
import { AuthService } from "./service";

/**
 * Configures the HTTP routing for authentication endpoints.
 *
 * @remarks
 * This module exposes endpoints for user registration, login, token refreshing,
 * and retrieving the current user's profile. It integrates the `AuthService`
 * with Elysia's routing and validation mechanisms.
 *
 * @public
 */
export const authModule = new Elysia({ prefix: "/auth", name: "module.auth" })
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, jwtAccess, jwtRefresh }) => {
      const user = await AuthService.register(body.email, body.password);
      const accessToken = await jwtAccess.sign({
        sub: user.id,
        role: user.role,
      });
      const refreshToken = await jwtRefresh.sign({ sub: user.id });
      return {
        success: true as const,
        data: {
          accessToken,
          refreshToken,
          user,
        },
      };
    },
    {
      body: AuthModel.registerBody,
      response: {
        200: createSuccessResponse(AuthModel.authResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Register a new client",
        description: "Creates a new client account and returns access and refresh tokens.",
        tags: ["Auth"],
      },
    }
  )
  .post(
    "/login",
    async ({ body, jwtAccess, jwtRefresh }) => {
      const user = await AuthService.login(body.email, body.password);
      const accessToken = await jwtAccess.sign({
        sub: user.id,
        role: user.role,
      });
      const refreshToken = await jwtRefresh.sign({ sub: user.id });
      return {
        success: true as const,
        data: {
          accessToken,
          refreshToken,
          user,
        },
      };
    },
    {
      body: AuthModel.loginBody,
      response: {
        200: createSuccessResponse(AuthModel.authResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Login to get access tokens",
        description: "Authenticates a user and returns access and refresh tokens.",
        tags: ["Auth"],
      },
    }
  )
  .post(
    "/refresh",
    async ({ body, jwtAccess, jwtRefresh }) => {
      const payload = await jwtRefresh.verify(body.refreshToken);
      if (payload === false || !payload.sub) {
        throw new UnauthorizedError("Invalid or expired refresh token");
      }

      const user = await AuthService.getUserById(payload.sub as string);
      const newAccessToken = await jwtAccess.sign({
        sub: user.id,
        role: user.role,
      });
      const newRefreshToken = await jwtRefresh.sign({ sub: user.id });

      return {
        success: true as const,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user,
        },
      };
    },
    {
      body: AuthModel.refreshBody,
      response: {
        200: createSuccessResponse(AuthModel.authResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Refresh access token",
        description:
          "Generates a new pair of access and refresh tokens using a valid refresh token.",
        tags: ["Auth"],
      },
    }
  )
  .get(
    "/me",
    async ({ user }) => {
      const fullUser = await AuthService.getUserById(user.id);
      return {
        success: true as const,
        data: fullUser,
      };
    },
    {
      isAuth: true,
      response: {
        200: createSuccessResponse(AuthModel.authResponse.properties.user),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Get current user profile",
        description: "Retrieves the profile of the currently authenticated user.",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .post(
    "/logout",
    async ({ headers }) => {
      const token = headers.authorization?.match(/Bearer\s+([^,]+)/)?.[1];
      if (token) {
        await AuthService.logout(token);
      }

      return {
        success: true as const,
        data: { message: "Logged out successfully" },
      };
    },
    {
      isAuth: true,
      response: {
        200: createSuccessResponse(t.Object({ message: t.String() })),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Logout user",
        description: "Revokes the current access token by adding it to the blocklist.",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
      },
    }
  );
