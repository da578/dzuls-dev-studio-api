import { t } from "elysia";

/**
 * Defines the TypeBox schemas for feature-related requests and responses.
 *
 * @public
 */
export const FeatureModel = {
  createBody: t.Object({
    userId: t.String({
      format: "uuid",
      description: "ID of the client requesting the feature",
    }),
    title: t.String({ minLength: 3, description: "Title of the feature" }),
    description: t.String({
      minLength: 10,
      description: "Detailed description of the feature",
    }),
    price: t.Number({
      minimum: 0,
      description: "Price in lowest currency denomination",
    }),
    deadline: t.String({
      format: "date-time",
      description: "ISO 8601 deadline date",
    }),
  }),
  updateStatusBody: t.Object({
    status: t.Union([
      t.Literal("BACKLOG"),
      t.Literal("IN_PROGRESS"),
      t.Literal("REVIEW"),
      t.Literal("COMPLETED"),
    ]),
    version: t.Number({
      description: "Current version of the feature for optimistic locking",
    }),
  }),
  featureResponse: t.Object({
    id: t.String({ format: "uuid" }),
    userId: t.String({ format: "uuid" }),
    title: t.String(),
    description: t.String(),
    price: t.Number(),
    deadline: t.Union([t.String(), t.Date()], {
      description: "Deadline date (accepts Date object or ISO string)",
    }),
    status: t.String(),
    version: t.Number(),
    createdAt: t.Union([t.String(), t.Date()], {
      description: "Creation timestamp",
    }),
    updatedAt: t.Union([t.String(), t.Date()], {
      description: "Last update timestamp",
    }),
  }),
};
