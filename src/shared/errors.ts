import { Elysia } from "elysia";
import { logger } from "../config/logger";
import { loggerPlugin } from "./logger-plugin";

/**
 * Base application error class.
 *
 * @remarks
 * All custom application errors must extend this class. The global error handler
 * catches instances of `AppError` and formats them into the standard error response.
 *
 * @public
 */
export abstract class AppError extends Error {
  public readonly isAppError = true;

  /**
   * @param statusCode - HTTP status code to return.
   * @param code - Application-specific error code.
   * @param message - Human-readable error message.
   * @param details - Optional additional error details.
   */
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

/**
 * Error thrown when a requested resource is not found.
 *
 * @public
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: unknown) {
    super(404, "NOT_FOUND", message, details);
  }
}

/**
 * Error thrown when authentication fails or is missing.
 *
 * @public
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access", details?: unknown) {
    super(401, "UNAUTHORIZED", message, details);
  }
}

/**
 * Error thrown when an authenticated user lacks required permissions.
 *
 * @public
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden access", details?: unknown) {
    super(403, "FORBIDDEN", message, details);
  }
}

/**
 * Error thrown when a state conflict occurs (e.g., optimistic locking failure, duplicate unique key).
 *
 * @public
 */
export class ConflictError extends AppError {
  constructor(message = "Resource conflict", details?: unknown) {
    super(409, "CONFLICT", message, details);
  }
}

/**
 * Error thrown when the client sends a malformed or invalid request.
 *
 * @public
 */
export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

/**
 * Global error handling plugin for Elysia.
 *
 * @remarks
 * Catches `AppError` subclasses, validation errors, and unknown errors,
 * formatting them into the standard `ErrorResponseSchema`.
 *
 * @public
 */
export const errorHandler = new Elysia({ name: "shared.errors" })
  .use(loggerPlugin)
  .error({
    AppError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    BadRequestError,
  })
  .onError({ as: "global" }, (context) => {
    const { code, error, set, request } = context;
    const requestId =
      ((context as Record<string, unknown>).requestId as string | undefined) ?? "unknown";

    if (code === "NOT_FOUND") {
      set.status = 404;
      logger.warn("Route Not Found", {
        requestId,
        method: request?.method,
        url: request?.url,
      });
      return {
        success: false as const,
        error: {
          code: "NOT_FOUND",
          message: "The requested route or resource was not found",
        },
      };
    }

    if (code === "VALIDATION") {
      set.status = 422;
      const validationError = error as { all?: unknown[] };
      logger.warn("Validation Error", {
        requestId,
        method: request?.method,
        url: request?.url,
        details: validationError.all,
      });
      const errObj: { code: string; message: string; details?: unknown } = {
        code: "VALIDATION_ERROR",
        message: "Invalid request input",
      };
      if (validationError.all !== undefined) {
        errObj.details = validationError.all;
      }
      return {
        success: false as const,
        error: errObj,
      };
    }

    if (error instanceof AppError || (error as Record<string, unknown>).isAppError === true) {
      const appError = error as AppError;
      set.status = appError.statusCode;
      logger.warn("Application Error", {
        requestId,
        code: appError.code,
        message: appError.message,
      });
      const errObj: { code: string; message: string; details?: unknown } = {
        code: appError.code,
        message: appError.message,
      };
      if (appError.details !== undefined) {
        errObj.details = appError.details;
      }
      return {
        success: false as const,
        error: errObj,
      };
    }

    set.status = 500;
    const dbError = error as Record<string, unknown>;
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      sqlState: dbError.code,
      detail: dbError.detail,
      hint: dbError.hint,
      internalQuery: dbError.internalQuery,
      cause: error instanceof Error ? error.cause : undefined,
    };

    logger.error("Unhandled Internal Error", {
      requestId,
      ...errorDetails,
    });
    return {
      success: false as const,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    };
  });
