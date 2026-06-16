import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import { logger } from "../config/logger";

/**
 * Global observability plugin for request tracking.
 *
 * @remarks
 * Generates a unique `requestId` for every incoming request and logs the
 * request lifecycle (start and completion) using Winston.
 *
 * @public
 */
export const loggerPlugin = new Elysia({ name: "shared.logger" })
  .derive({ as: "global" }, () => ({
    requestId: randomUUID(),
  }))
  .onBeforeHandle({ as: "global" }, ({ request, requestId }) => {
    logger.info("Processing Request", {
      requestId,
      method: request.method,
      url: request.url,
    });
  })
  .onAfterResponse({ as: "global" }, ({ request, requestId, set }) => {
    logger.info("Request Completed", {
      requestId,
      method: request.method,
      url: request.url,
      status: set.status,
    });
  });
