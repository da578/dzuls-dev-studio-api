import { eq } from "drizzle-orm";
import { db } from "../../db";
import { features, idempotencyKeys, payments } from "../../db/schema";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors";

/**
 * Handles business logic for payment processing and webhooks.
 *
 * @remarks
 * Enforces strict idempotency and uses database transactions to ensure
 * data consistency between payments and features.
 *
 * @public
 */
export abstract class PaymentService {
  /**
   * Processes an incoming Midtrans webhook securely.
   *
   * @remarks
   * 1. Verifies the SHA-512 signature.
   * 2. Checks idempotency using a SHA-256 hash of the payload.
   * 3. Updates payment and feature status within a transaction.
   *
   * @param payload - The raw webhook payload.
   * @param idempotencyKey - The unique key provided by the gateway (or generated from payload).
   * @returns The processing result.
   *
   * @public
   */
  static async processWebhook(
    payload: {
      order_id: string;
      transaction_status: string;
      signature_key: string;
      status_code: string;
      gross_amount: string;
    },
    idempotencyKey: string
  ) {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const signatureInput = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;

    const hasher512 = new Bun.CryptoHasher("sha512");
    hasher512.update(signatureInput);

    const expectedSignature = hasher512.digest("hex");
    if (expectedSignature !== payload.signature_key) {
      throw new BadRequestError("Invalid webhook signature");
    }

    const hasher256 = new Bun.CryptoHasher("sha256");
    hasher256.update(JSON.stringify(payload));
    const requestHash = hasher256.digest("hex");

    const existingKey = await db.query.idempotencyKeys.findFirst({
      where: eq(idempotencyKeys.key, idempotencyKey),
    });

    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        throw new ConflictError("Idempotency key exists with different payload");
      }
      return existingKey.responseBody as { status: string; message: string };
    }

    const result = await db.transaction(async (tx) => {
      const payment = await tx.query.payments.findFirst({
        where: eq(payments.id, payload.order_id),
      });

      if (!payment) {
        throw new NotFoundError("Payment order not found");
      }

      let newStatus: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" = "PENDING";
      if (payload.transaction_status === "settlement" || payload.transaction_status === "capture") {
        newStatus = "SUCCESS";
      } else if (payload.transaction_status === "cancel" || payload.transaction_status === "deny") {
        newStatus = "FAILED";
      } else if (payload.transaction_status === "expire") {
        newStatus = "EXPIRED";
      }

      await tx
        .update(payments)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));

      if (newStatus === "SUCCESS") {
        await tx
          .update(features)
          .set({ status: "IN_PROGRESS", updatedAt: new Date() })
          .where(eq(features.id, payment.featureId));
      }

      const responseBody = {
        status: "processed",
        message: `Payment marked as ${newStatus}`,
      };

      await tx.insert(idempotencyKeys).values({
        key: idempotencyKey,
        requestHash,
        responseStatus: 200,
        responseBody,
      });

      return responseBody;
    });

    return result;
  }
}
