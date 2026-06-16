import Elysia, { t } from "elysia";
import { authPlugin } from "../../shared/auth-plugin";
import { createSuccessResponse, StandardErrorResponses } from "../../shared/schema";
import { UserModel } from "./model";
import { UserService } from "./service";

/**
 * Configures the HTTP routing for user management endpoints.
 *
 * @remarks
 * Enforces RBAC: Only users with the DEVELOPER role can access these endpoints.
 * Provides standard CRUD operations for user records.
 *
 * @public
 */
export const usersModule = new Elysia({
  prefix: "/users",
  name: "module.users",
})
  .use(authPlugin)
  .guard({ isAuth: true })
  .guard({ role: ["DEVELOPER"] })
  .get(
    "/",
    async () => {
      const data = await UserService.getAll();
      return { success: true as const, data };
    },
    {
      response: {
        200: createSuccessResponse(t.Array(UserModel.userResponse)),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "List all users",
        description: "Retrieves a list of all registered users. Restricted to DEVELOPER role.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id } }) => {
      const data = await UserService.getById(id);
      return { success: true as const, data };
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid", description: "User ID" }),
      }),
      response: {
        200: createSuccessResponse(UserModel.userResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Get user details",
        description: "Retrieves the details of a specific user by their ID.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const data = await UserService.create({
        email: body.email,
        passwordRaw: body.password,
        role: body.role as "CLIENT" | "DEVELOPER",
      });
      return { success: true as const, data };
    },
    {
      body: UserModel.createBody,
      response: {
        200: createSuccessResponse(UserModel.userResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Create a new user",
        description: "Creates a new user account manually.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .patch(
    "/:id",
    async ({ params: { id }, body }) => {
      const data = await UserService.update(id, {
        email: body.email,
        passwordRaw: body.password,
        role: body.role as "CLIENT" | "DEVELOPER" | undefined,
      });
      return { success: true as const, data };
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid", description: "User ID" }),
      }),
      body: UserModel.updateBody,
      response: {
        200: createSuccessResponse(UserModel.userResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Update user details",
        description: "Updates the details of an existing user.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id } }) => {
      const data = await UserService.delete(id);
      return { success: true as const, data };
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid", description: "User ID" }),
      }),
      response: {
        200: createSuccessResponse(t.Object({ id: t.String() })),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Delete a user",
        description: "Permanently removes a user account from the system.",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
      },
    }
  );
