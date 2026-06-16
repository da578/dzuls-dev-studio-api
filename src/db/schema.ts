import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Enum representing user roles in the system.
 *
 * @public
 */
export const roleEnum = pgEnum("role", ["CLIENT", "DEVELOPER"]);

/**
 * Enum representing the lifecycle status of a feature.
 *
 * @public
 */
export const featureStatusEnum = pgEnum("feature_status", [
  "BACKLOG",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETED",
]);

/**
 * Enum representing the status of a payment transaction.
 *
 * @public
 */
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "EXPIRED",
]);

/**
 * Users table storing both clients and developers.
 *
 * @remarks
 * This table acts as the central identity store. Passwords must be hashed
 * before insertion.
 *
 * @public
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: roleEnum("role").default("CLIENT").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Features table representing the backlog items requested by clients.
 *
 * @remarks
 * Includes a `version` column to enforce optimistic locking during status updates,
 * preventing race conditions when multiple actors attempt to modify the feature.
 *
 * @public
 */
export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  deadline: timestamp("deadline").notNull(),
  status: featureStatusEnum("status").default("BACKLOG").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Payments table tracking client invoices and transactions.
 *
 * @remarks
 * Links a specific feature to a user and tracks the payment status updated
 * via external payment gateway webhooks.
 *
 * @public
 */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id")
    .references(() => features.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Idempotency keys table to prevent duplicate webhook processing.
 *
 * @remarks
 * Stores the hash of incoming webhook payloads to ensure that retried webhooks
 * from payment gateways do not result in double-fulfillment.
 *
 * @public
 */
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  requestHash: varchar("request_hash", { length: 255 }).notNull(),
  responseStatus: integer("response_status"),
  responseBody: jsonb("response_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Table storing revoked JSON Web Tokens (JWTs).
 *
 * @remarks
 * This table acts a blocklist for tokens that have been explicitly.
 * invalidated via the logout process before their natural expiration.
 *
 * @public
 */
export const revokedTokens = pgTable("rekoved_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  revokedAt: timestamp("revoked_at").defaultNow().notNull(),
});
