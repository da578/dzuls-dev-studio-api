import { type TSchema, t } from "elysia";

/**
 * Creates a standard success response schema without metadata.
 *
 * @remarks
 * This factory function ensures all successful API responses follow a consistent
 * structure: `{ success: true, data: T }`.
 *
 * @param dataSchema - The TypeBox schema representing the `data` payload.
 * @returns A TypeBox object schema for the success response.
 *
 * @example
 * ```ts
 * const UserResponse = createSuccessResponse(t.Object({ id: t.String(), name: t.String() }));
 * ```
 *
 * @public
 */
export const createSuccessResponse = <T extends TSchema>(dataSchema: T) => {
  return t.Object(
    {
      success: t.Literal(true),
      data: dataSchema,
    },
    { description: "Standard success response" }
  );
};

/**
 * Creates a standard success response schema with metadata.
 *
 * @remarks
 * This factory function ensures all successful API responses follow a consistent
 * structure: `{ success: true, data: T, meta: M }`.
 *
 * @param dataSchema - The TypeBox schema representing the `data` payload.
 * @param metaSchema - The TypeBox schema representing the `meta` payload.
 * @returns A TypeBox object schema for the success response.
 *
 * @public
 */
export const createSuccessResponseWithMeta = <T extends TSchema, M extends TSchema>(
  dataSchema: T,
  metaSchema: M
) => {
  return t.Object(
    {
      success: t.Literal(true),
      data: dataSchema,
      meta: metaSchema,
    },
    { description: "Standard success response with metadata" }
  );
};

/**
 * Standard error response schema.
 *
 * @remarks
 * Ensures all error responses follow the structure:
 * `{ success: false, error: { code: string, message: string, details?: any } }`.
 *
 * @public
 */
export const ErrorResponseSchema = t.Object(
  {
    success: t.Literal(false),
    error: t.Object({
      code: t.String({
        description: "Application-specific error code (e.g., NOT_FOUND)",
      }),
      message: t.String({ description: "Human-readable error message" }),
      details: t.Optional(t.Any({ description: "Optional validation or error details" })),
    }),
  },
  { description: "Standard error response" }
);

export const StandardErrorResponses = {
  400: ErrorResponseSchema,
  401: ErrorResponseSchema,
  403: ErrorResponseSchema,
  404: ErrorResponseSchema,
  409: ErrorResponseSchema,
  422: ErrorResponseSchema,
  500: ErrorResponseSchema,
};

/**
 * Standard pagination query parameters schema.
 *
 * @remarks
 * Uses `t.Numeric()` to automatically cast incoming string query parameters to numbers.
 * Limits the maximum page size to 100 to prevent denial-of-service via massive queries.
 *
 * @public
 */
export const PaginationQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ default: 1, minimum: 1, description: "Page number" })),
  limit: t.Optional(
    t.Numeric({
      default: 10,
      minimum: 1,
      maximum: 100,
      description: "Items per page",
    })
  ),
});

/**
 * Standard pagination metadata schema.
 *
 * @remarks
 * Used inside the `meta` field of a success response when returning a list of items.
 *
 * @public
 */
export const PaginationMetaSchema = t.Object({
  total: t.Number({ description: "Total number of items across all pages" }),
  page: t.Number({ description: "Current page number" }),
  limit: t.Number({ description: "Number of items per page" }),
  totalPages: t.Number({ description: "Total number of pages available" }),
});
