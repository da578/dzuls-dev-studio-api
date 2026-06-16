import { t } from "elysia";

/**
 * Defines the TypeBox schemas for authentication-related requests and responses.
 *
 * @remarks
 * These schemas are used to validate incoming HTTP payloads and to generate
 * OpenAPI documentation. They ensure that all authentication data conforms to
 * the expected structure before reaching the service layer.
 *
 * @public
 */
export const AuthModel = {
  registerBody: t.Object({
    email: t.String({ format: "email", description: "Valid email address of the user" }),
    password: t.String({ minLength: 8, description: "Password with a minimum of 8 characters" }),
  }),
  loginBody: t.Object({
    email: t.String({ format: "email", description: "Registered email address" }),
    password: t.String({ description: "Plain-text password" }),
  }),
  authResponse: t.Object({
    accessToken: t.String({ description: "Short-lived JWT access token" }),
    refreshToken: t.String({ description: "Long-lived JWT refresh token" }),
    user: t.Object({
      id: t.String({ description: "Unique identifier of the user" }),
      email: t.String({ description: "Email address of the user" }),
      role: t.Union([t.Literal("CLIENT"), t.Literal("DEVELOPER")], {
        description: "Assigned role of the user",
      }),
    }),
  }),
  refreshBody: t.Object({
    refreshToken: t.String({ description: "Valid refresh token obtained during login" }),
  }),
};
