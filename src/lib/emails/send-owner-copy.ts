import type { Resend } from "resend";
import { getOwnerEmail, shouldSendOwnerCopy } from "./owner-inbox";
import { getResendFrom } from "./resend-config";

type OwnerCopyPayload = {
  subject: string;
  html: string;
  /** Customer email — used for reply-to and skip-when-same-as-owner check. */
  customerEmail: string;
  logContext: string;
};

/**
 * Sends an internal copy to OWNER_EMAIL after a customer-facing email.
 * Skips when the customer address is the same as the owner inbox (e.g. owner testing).
 */
export async function sendOwnerCopy(
  resend: Resend,
  payload: OwnerCopyPayload,
): Promise<void> {
  const owner = getOwnerEmail();
  if (!owner) {
    console.warn(`[${payload.logContext}] OWNER_EMAIL not set; skipping owner copy`);
    return;
  }

  const customerEmail = payload.customerEmail.trim();
  if (!shouldSendOwnerCopy(customerEmail)) {
    console.info(
      `[${payload.logContext}] owner copy skipped (customer inbox matches owner)`,
    );
    return;
  }

  try {
    await resend.emails.send({
      from: getResendFrom(),
      to: owner,
      replyTo: customerEmail || undefined,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (e) {
    console.error(`[${payload.logContext}] owner notification email failed`, e);
  }
}
