"use server";

import db from "@/lib/db";
import { createResendClient, getResendFrom } from "@/lib/emails/resend-config";
import { sendOwnerCopy } from "@/lib/emails/send-owner-copy";
import {
  buildPaymentSuccessEmailHtml,
  buildReportRequestEmailHtml,
} from "@/lib/emails/templates";
import { normalizeUsPhone } from "@/lib/phone-validation";

type ReportRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  vnNumber: string;
};

export async function handleReportRequest(data: ReportRequest) {
  try {
    const { firstName, lastName, email, vnNumber } = data;
    const phoneNumber = normalizeUsPhone(data.phoneNumber);

    if (!firstName || !lastName || !email || !vnNumber || !phoneNumber) {
      throw new Error("Required fields are missing");
    }

    const report = await db.report.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber,
        vinNumber: vnNumber,
      },
    });

    const fullName = `${firstName} ${lastName}`;
    const resend = createResendClient();

    if (resend) {
      const from = getResendFrom();

      await resend.emails.send({
        from,
        to: email,
        subject: `Your Car Inspection Request - TrueK`,
        html: buildReportRequestEmailHtml({
          customerName: fullName,
          email,
          phoneNumber,
          vin: vnNumber,
        }),
      });

      await sendOwnerCopy(resend, {
        customerEmail: email,
        subject: `🚗 New Order Request: ${vnNumber}`,
        html: buildReportRequestEmailHtml({
          customerName: fullName,
          email,
          phoneNumber,
          vin: vnNumber,
          forOwner: true,
        }),
        logContext: "handleReportRequest",
      });
    }

    return { success: true, data: report };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Legacy payment email helper — prefer finalize-report-purchase for Shopify checkout.
 * Sends branded payment confirmation to customer and owner copy.
 */
export async function sendPaymentSuccessEmails(data: {
  email: string;
  name: string;
  vin: string;
  orderId: string;
  amount: string;
}) {
  const resend = createResendClient();
  if (!resend) {
    return { success: false };
  }

  try {
    const displayName =
      data.name && data.name !== "Customer" ? data.name : "Valued Customer";
    const from = getResendFrom();
    const amountDisplay = data.amount.replace(/^\$/, "");

    await resend.emails.send({
      from,
      to: data.email,
      subject: "Payment received — TrueK Inspection",
      html: buildPaymentSuccessEmailHtml({
        customerName: displayName,
        orderId: data.orderId,
        amountDisplay,
        currency: "USD",
        vin: data.vin,
      }),
    });

    await sendOwnerCopy(resend, {
      customerEmail: data.email,
      subject: `[TrueK] New payment — ${data.vin}`,
      html: buildPaymentSuccessEmailHtml({
        customerName: displayName,
        orderId: data.orderId,
        amountDisplay,
        currency: "USD",
        vin: data.vin,
        forOwner: true,
        customerEmail: data.email,
      }),
      logContext: "sendPaymentSuccessEmails",
    });

    return { success: true };
  } catch (error) {
    console.error("[sendPaymentSuccessEmails]", error);
    return { success: false };
  }
}
