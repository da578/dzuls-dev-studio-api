import { Resend } from "resend";
import { logger } from "../../config/logger";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_key_for_validation");

/**
 * Handles automated email dispatching.
 *
 * @remarks
 * Uses the Resend API to send transactional emails. All methods should be
 * called asynchronously (fire-and-forget) to prevent blocking the main HTTP response.
 *
 * @public
 */
export abstract class NotificationService {
  /**
   * Sends an email notification to the client when their feature is completed.
   *
   * @param clientEmail - The email address of the client.
   * @param featureTitle - The title of the completed feature.
   * @returns A promise that resolves when the email dispatch is initiated.
   *
   * @public
   */
  static async sendFeatureCompletedEmail(clientEmail: string, featureTitle: string): Promise<void> {
    try {
      await resend.emails.send({
        from: "Dzul's Dev Studio <dzulkiflianwar2@gmail.com>",
        to: clientEmail,
        subject: `Feature Completed: ${featureTitle}`,
        html: `
        <div style="font-family: sans-serif; color: #333;">
           <h2>Great news!</h2>
           <p>Your requested feature <strong>${featureTitle}</strong> has been marked as completed.</p>
           <p>Thank you for using Dzul's Dev Studio Services.</p>
         </div>
       `,
      });
      logger.info("Feature completed email dispatched", {
        clientEmail,
        featureTitle,
      });
    } catch (error) {
      logger.error("Failed to dispatch feature completed email", {
        error,
        clientEmail,
        featureTitle,
      });
    }
  }
}
