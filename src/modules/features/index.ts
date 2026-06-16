import Elysia, { t } from "elysia";
import { authPlugin } from "../../shared/auth-plugin";
import { ForbiddenError } from "../../shared/errors";
import { createSuccessResponse, StandardErrorResponses } from "../../shared/schema";
import { FeatureModel } from "./model";
import { FeatureService } from "./service";

/**
 * Configures the HTTP routing for feature backlog endpoints.
 *
 * @remarks
 * Enforces RBAC: Developers can CRUD all features. Clients can only read their own.
 *
 * @public
 */
export const featuresModule = new Elysia({
  prefix: "/features",
  name: "module.features",
})
  .use(authPlugin)
  .guard({ isAuth: true })
  .post(
    "/",
    async ({ body }) => {
      const feature = await FeatureService.createFeature({
        ...body,
        deadline: new Date(body.deadline),
      });
      return { success: true as const, data: feature };
    },
    {
      role: ["DEVELOPER"],
      body: FeatureModel.createBody,
      response: {
        200: createSuccessResponse(FeatureModel.featureResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Create a new feature",
        tags: ["Features"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .get(
    "/",
    async ({ user }) => {
      const userIdFilter = user.role === "CLIENT" ? user.id : undefined;
      const data = await FeatureService.getFeatures(userIdFilter);
      return { success: true as const, data };
    },
    {
      response: {
        200: createSuccessResponse(t.Array(FeatureModel.featureResponse)),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "List features",
        tags: ["Features"],
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      const feature = await FeatureService.getFeatureById(id);
      if (user.role === "CLIENT" && feature.userId !== user.id) {
        throw new ForbiddenError("You do not have permission to view this feature");
      }
      return { success: true as const, data: feature };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: createSuccessResponse(FeatureModel.featureResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Get feature details",
        tags: ["Features"],
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .patch(
    "/:id/status",
    async ({ params: { id }, body }) => {
      const feature = await FeatureService.updateFeatureStatus(id, body.status, body.version);
      return { success: true as const, data: feature };
    },
    {
      role: ["DEVELOPER"],
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: FeatureModel.updateStatusBody,
      response: {
        200: createSuccessResponse(FeatureModel.featureResponse),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Update feature status",
        tags: ["Features"],
        security: [{ bearerAuth: [] }],
      },
    }
  );
