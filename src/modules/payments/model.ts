import { t } from "elysia";
/**
 * Defines the TypeBox schemas for payment webhooks.
 *
 * @public
 */
export const PaymentModel = {
  midtransWebhookBody: t.Object({
    order_id: t.String({ description: "The payment ID in our system" }),
    transaction_status: t.String({
      description: "Status from Midtrans (e.g., settlement, pending)",
    }),
    signature_key: t.String({ description: "SHA512 signature from Midtrans" }),
    status_code: t.String(),
    gross_amount: t.String(),
  }),
};
