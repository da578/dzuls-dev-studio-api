import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { logger } from "./config/logger";
import { authModule } from "./modules/auth";
import { featuresModule } from "./modules/features";
import { paymentsModule } from "./modules/payments";
import { usersModule } from "./modules/users";
import { errorHandler } from "./shared/errors";
import { loggerPlugin } from "./shared/logger-plugin";
import { createSuccessResponse, StandardErrorResponses } from "./shared/schema";

/**
 * The main application instance for Dzul's Dev Studio API.
 *
 * @remarks
 * This instance is configured for serverless deployment. It includes global
 * plugins such as CORS, OpenAPI documentation, and standard error handling.
 * It mounts all feature modules to expose the complete API surface.
 *
 * @public
 */
export const app = new Elysia({ aot: false })
  .use(loggerPlugin)
  .use(cors())
  .use(
    openapi({
      documentation: {
        info: {
          title: "Dzul's Dev Studio API",
          version: "1.0.0",
          description: "Spec-Driven Serverless API for Freelance Feature Management",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    })
  )
  .use(errorHandler)
  .use(authModule)
  .use(usersModule)
  .use(featuresModule)
  .use(paymentsModule)
  .get(
    "/health",
    () => ({
      success: true as const,
      data: { status: "ok", timestamp: new Date().toISOString() },
    }),
    {
      response: {
        200: createSuccessResponse(
          t.Object({
            status: t.String({ description: "Current status of the API" }),
            timestamp: t.String({
              description: "ISO 8601 timestamp of the health check",
            }),
          })
        ),
        ...StandardErrorResponses,
      },
      detail: {
        summary: "Health Check",
        description: "Returns the health status of the API. Used by load balancers and monitors.",
      },
    }
  )
  .compile();

if (typeof Bun !== "undefined" && !process.env.CF_PAGES && !process.env.CLOUDFLARE) {
  app.listen(process.env.PORT ?? 3000, (server) => {
    logger.info(`🦊 Dzul's Dev Studio API is running at ${server.hostname}:${server.port}`);
  });
}

/**
 * Default export required by Cloudflare Workers.
 */
export default app;

/**
 * Type definition of the main application instance.
 *
 * @remarks
 * Exported for use with `@elysiajs/eden` to provide end-to-end type safety
 * for frontend clients.
 *
 * @public
 */
export type App = typeof app;
