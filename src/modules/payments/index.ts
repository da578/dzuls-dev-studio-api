import Elysia, { t } from "elysia";
import { BadRequestError } from "../../shared/errors";
import { createSuccessResponse, StandardErrorResponses } from "../../shared/schema";
import { PaymentModel } from "./model";
import { PaymentService } from "./service";

/**
 * Configures the HTTP routing for payment endpoints.
 *
 * @remarks
 * Exposes the webhook endpoint for the payment gateway.
 *
 * @public
 */
export const paymentsModule = new Elysia({
  prefix: "/payments",
  name: "module.payments",
}).post(
  "/webhook",
  async ({ body, headers }) => {
    const idempotencyKey =
      headers["idempotency-key"] || `${body.order_id}-${body.transaction_status}`;

    if (!idempotencyKey) {
      throw new BadRequestError("Missing Idempotency-Key");
    }

    const result = await PaymentService.processWebhook(body, idempotencyKey);
    return { success: true as const, data: result };
  },
  {
    headers: t.Object(
      { "idempotency-key": t.Optional(t.String()) },
      { additionalProperties: true }
    ),
    body: PaymentModel.midtransWebhookBody,
    response: {
      200: createSuccessResponse(
        t.Object({
          status: t.String(),
          message: t.String(),
        })
      ),
      ...StandardErrorResponses,
    },
    detail: {
      summary: "Payment Gateway Webhook",
      description: "Receives payment status updates from Midtrans.",
      tags: ["Payments"],
    },
  }
);
