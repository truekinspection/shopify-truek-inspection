"use server";

import db from "@/lib/db";
import { createResendClient, getResendFrom } from "@/lib/emails/resend-config";
import { sendOwnerCopy } from "@/lib/emails/send-owner-copy";
import { buildContactConfirmationEmailHtml } from "@/lib/emails/templates";

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  vnnumber: string;
  message: string;
};

export async function handleContactForm(data: ContactFormData) {
  try {
    const { firstName, lastName, email, vnnumber, message } = data;

    const contact = await db.contact.create({
      data: { firstName, lastName, email, vnnumber, message },
    });

    const resend = createResendClient();
    if (resend) {
      const from = getResendFrom();

      try {
        await resend.emails.send({
          from,
          to: email,
          subject: "We've received your message - TrueK",
          html: buildContactConfirmationEmailHtml({
            firstName,
            lastName,
            email,
            vnnumber,
            message,
          }),
        });
      } catch (emailErr) {
        console.error("[handleContactForm] user confirmation email failed", emailErr);
      }

      await sendOwnerCopy(resend, {
        customerEmail: email,
        subject: `[TrueK] New contact — ${email}`,
        html: buildContactConfirmationEmailHtml({
          firstName,
          lastName,
          email,
          vnnumber,
          message,
          forOwner: true,
        }),
        logContext: "handleContactForm",
      });
    }

    return { success: true, data: contact };
  } catch (error) {
    console.error("[handleContactForm]", error);
    return { success: false, error: "Internal Server Error" };
  }
}
