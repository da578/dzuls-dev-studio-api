import { t } from "elysia";

/**
 * Defines the TypeBox schemas for user-related requests and responses.
 *
 * @remarks
 * These schemas are used to validate incoming HTTP payloads and to generate
 * OpenAPI documentation for the user management module.
 *
 * @public
 */
export const UserModel = {
  userResponse: t.Object({
    id: t.String({
      format: "uuid",
      description: "Unique identifier of the user",
    }),
    email: t.String({
      format: "email",
      description: "Email address of the user",
    }),
    role: t.String({ description: "Assigned role of the user" }),
    createdAt: t.Union([t.String(), t.Date()], {
      description: "Creation timestamp",
    }),
    updatedAt: t.Union([t.String(), t.Date()], {
      description: "Last update timestamp",
    }),
  }),
  createBody: t.Object({
    email: t.String({ format: "email", description: "Valid email address" }),
    password: t.String({
      minLength: 8,
      description: "Password with a minimum of 8 characters",
    }),
    role: t.Union([t.Literal("CLIENT"), t.Literal("DEVELOPER")], {
      description: "Role to assign",
    }),
  }),
  updateBody: t.Object({
    email: t.Optional(t.String({ format: "email", description: "Valid email address" })),
    password: t.Optional(
      t.String({
        minLength: 8,
        description: "Password with a minimum of 8 characters",
      })
    ),
    role: t.Optional(
      t.Union([t.Literal("CLIENT"), t.Literal("DEVELOPER")], {
        description: "Role to assign",
      })
    ),
  }),
};
