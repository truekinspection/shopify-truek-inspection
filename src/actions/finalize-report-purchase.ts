"use server";

import { randomBytes } from "crypto";
import db from "@/lib/db";
import { buildReportDeliveryEmailHtml } from "@/lib/emails/templates";
import { createResendClient, getResendFrom } from "@/lib/emails/resend-config";
import { sendOwnerCopy } from "@/lib/emails/send-owner-copy";
import { computeReportPreviewExpiry } from "@/lib/report-preview-access";
import { REPORT_PRICE_DISPLAY } from "@/lib/constants";
import {
  getPaidShopifyOrder,
  getVinAttributeKey,
  orderIdFromGid,
} from "@/lib/shopify";
import { fetchClearVinReport } from "@/actions/clearvin";
import { extractReportIdFromClearVinPayload } from "@/lib/clearvin/extract-report-id";
import { normalizeUsPhone } from "@/lib/phone-validation";
import { normalizeVin } from "@/lib/vin-validation";

const STALE_PENDING_MS = 70_000;
const WAITER_TIMEOUT_MS = 45_000;

type FulfillResult =
  | { success: true; token: string }
  | { success: false; error: string };

const inFlightByOrder = new Map<string, Promise<FulfillResult>>();

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

function uniqueIds(...ids: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      ids
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    ),
  ];
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "https://www.truekinspection.com";
  return raw.replace(/\/+$/, "");
}

function splitCustomerName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const t = displayName.trim();
  if (!t) return { firstName: "Customer", lastName: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const v = metadata?.[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function extractVin(attributes?: Record<string, unknown> | null): string {
  const vinKey = getVinAttributeKey();
  const raw =
    metaString(attributes, vinKey) || metaString(attributes, "vin");
  return raw ? normalizeVin(raw) : "";
}

async function findExistingTokenForOrder(
  transactionIds: string | string[],
  vin: string,
): Promise<string | null> {
  const ids = uniqueIds(
    ...(Array.isArray(transactionIds) ? transactionIds : [transactionIds]),
  );
  if (!ids.length) return null;

  const existing = await db.payment.findFirst({
    where: { orderID: { in: ids }, status: "COMPLETED" },
  });
  if (!existing) return null;

  const tokenRow = await db.reportPreviewToken.findFirst({
    where: {
      vin: vin.trim(),
      createdAt: { gte: new Date(existing.createdAt.getTime() - 5_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  return tokenRow?.token ?? null;
}

async function waitForExistingToken(
  transactionIds: string[],
  vin: string,
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < WAITER_TIMEOUT_MS) {
    const token = await findExistingTokenForOrder(transactionIds, vin);
    if (token) return token;
    await sleep(400);
  }
  return findExistingTokenForOrder(transactionIds, vin);
}

/**
 * Atomically claims the ClearVIN fetch for this Shopify order.
 * The unique Payment.orderID row is the idempotency key.
 */
async function claimFulfillmentSlot(params: {
  canonicalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
}): Promise<"fetcher" | "waiter"> {
  try {
    await db.payment.create({
      data: {
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phoneNumber: params.phoneNumber?.trim() || null,
        plan: `Vehicle History Report — ${REPORT_PRICE_DISPLAY}`,
        orderID: params.canonicalId,
        status: "PENDING",
      },
    });
    return "fetcher";
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await db.payment.findUnique({
      where: { orderID: params.canonicalId },
    });
    if (!existing) return "waiter";
    if (existing.status === "COMPLETED") return "waiter";

    const ageMs = Date.now() - existing.createdAt.getTime();
    if (existing.status === "PENDING" && ageMs > STALE_PENDING_MS) {
      console.warn(
        "[fulfillPurchase] reclaiming stale PENDING fulfillment",
        params.canonicalId,
      );
      return "fetcher";
    }
    return "waiter";
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolvePhoneNumber(params: {
  phoneNumber?: string | null;
  email: string;
  vin: string;
}): Promise<string | null> {
  const direct = params.phoneNumber?.trim();
  if (direct) {
    return normalizeUsPhone(direct) || direct;
  }

  try {
    const lead = await db.report.findFirst({
      where: {
        email: params.email.trim(),
        vinNumber: params.vin.trim(),
        phoneNumber: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { phoneNumber: true },
    });
    const fromLead = lead?.phoneNumber?.trim();
    if (!fromLead) return null;
    return normalizeUsPhone(fromLead) || fromLead;
  } catch {
    return null;
  }
}

async function persistAndEmail(params: {
  html: string;
  vin: string;
  clearvinReportId?: string | null;
  customerEmail: string;
  customerDisplayName: string;
  transactionId: string;
  phoneNumber?: string | null;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const email = params.customerEmail.trim();
  const vin = params.vin.trim();
  const transactionId = params.transactionId.trim();

  const existingToken = await findExistingTokenForOrder(transactionId, vin);
  if (existingToken) {
    return { success: true, token: existingToken };
  }

  const { firstName, lastName } = splitCustomerName(params.customerDisplayName);
  const token = generateToken();
  const expiresAt = computeReportPreviewExpiry();
  const reportIdStr =
    params.clearvinReportId?.trim() ||
    extractReportIdFromClearVinPayload(params.html, null) ||
    null;
  if (!reportIdStr) {
    console.warn(
      "[finalizeReportPurchase] ClearVIN report id missing from payload; email will show —",
    );
  }
  const phoneNumber = await resolvePhoneNumber({
    phoneNumber: params.phoneNumber,
    email,
    vin,
  });

  try {
    await db.$transaction(
      async (tx) => {
        await tx.reportPreviewToken.create({
          data: {
            token,
            html: params.html,
            vin,
            clearvinReportId: reportIdStr,
            expiresAt,
          },
        });
        await tx.payment.upsert({
          where: { orderID: transactionId },
          create: {
            firstName,
            lastName,
            email,
            phoneNumber,
            plan: `Vehicle History Report — ${REPORT_PRICE_DISPLAY}`,
            orderID: transactionId,
            status: "COMPLETED",
          },
          update: {
            firstName,
            lastName,
            email,
            ...(phoneNumber ? { phoneNumber } : {}),
            plan: `Vehicle History Report — ${REPORT_PRICE_DISPLAY}`,
            status: "COMPLETED",
          },
        });
      },
      {
        maxWait: 20_000,
        timeout: 30_000,
      },
    );
  } catch (e) {
    const raced = await findExistingTokenForOrder(transactionId, vin);
    if (raced) {
      return { success: true, token: raced };
    }
    console.error("[finalizeReportPurchase] DB transaction failed", e);
    return {
      success: false,
      error: "We could not save your order. Please contact support.",
    };
  }

  const origin = appOrigin();
  const reportUrl = `${origin}/report-preview?token=${encodeURIComponent(token)}&vin=${encodeURIComponent(vin)}`;
  const resend = createResendClient();
  const from = getResendFrom();

  if (resend) {
    const customerLabel =
      [firstName, lastName].filter(Boolean).join(" ").trim() || "Customer";
    const emailHtml = buildReportDeliveryEmailHtml({
      customerName: customerLabel,
      reportUrl,
      vin,
      reportId: reportIdStr,
      transactionId,
      customerEmail: email,
      phoneNumber,
      vehicleYear: params.vehicleYear,
      vehicleMake: params.vehicleMake,
      vehicleModel: params.vehicleModel,
    });

    try {
      await resend.emails.send({
        from,
        to: email,
        subject: "Your vehicle history report — TrueK Inspection",
        html: emailHtml,
      });
    } catch (err) {
      console.error("[finalizeReportPurchase] customer report email", err);
    }

    await sendOwnerCopy(resend, {
      customerEmail: email,
      subject: `[TrueK] Purchase complete — ${vin}`,
      html: buildReportDeliveryEmailHtml({
        customerName: customerLabel,
        reportUrl,
        vin,
        reportId: reportIdStr,
        transactionId,
        customerEmail: email,
        phoneNumber,
        vehicleYear: params.vehicleYear,
        vehicleMake: params.vehicleMake,
        vehicleModel: params.vehicleModel,
        forOwner: true,
      }),
      logContext: "finalizeReportPurchase",
    });
  } else {
    console.warn(
      "[finalizeReportPurchase] RESEND_API_KEY not set; skipping emails.",
    );
  }

  void db.reportPreviewToken
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  return { success: true, token };
}

async function fulfillPurchaseFromOrderData(input: {
  transactionId: string;
  checkoutId?: string | null;
  vin: string;
  customerEmail: string;
  customerDisplayName: string;
  phoneNumber?: string | null;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}): Promise<FulfillResult> {
  const vin = input.vin.trim();
  const email = input.customerEmail.trim();
  const transactionId = input.transactionId.trim();
  const checkoutId =
    typeof input.checkoutId === "string" ? input.checkoutId.trim() : "";
  const canonicalId = orderIdFromGid(checkoutId || transactionId) || transactionId;
  const orderIds = uniqueIds(
    canonicalId,
    orderIdFromGid(checkoutId),
    orderIdFromGid(transactionId),
    checkoutId,
    transactionId,
  );

  if (!vin) {
    return { success: false, error: "VIN missing from order data." };
  }
  if (!email) {
    return { success: false, error: "Customer email missing from order." };
  }

  const inflight = inFlightByOrder.get(canonicalId);
  if (inflight) {
    return inflight;
  }

  const work = fulfillClaimedPurchase({
    vin,
    email,
    canonicalId,
    orderIds,
    customerDisplayName: input.customerDisplayName,
    phoneNumber: input.phoneNumber,
    vehicleYear: input.vehicleYear,
    vehicleMake: input.vehicleMake,
    vehicleModel: input.vehicleModel,
  });
  inFlightByOrder.set(canonicalId, work);
  try {
    return await work;
  } finally {
    inFlightByOrder.delete(canonicalId);
  }
}

async function fulfillClaimedPurchase(input: {
  vin: string;
  email: string;
  canonicalId: string;
  orderIds: string[];
  customerDisplayName: string;
  phoneNumber?: string | null;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}): Promise<FulfillResult> {
  const existingToken = await findExistingTokenForOrder(input.orderIds, input.vin);
  if (existingToken) {
    return { success: true, token: existingToken };
  }

  const { firstName, lastName } = splitCustomerName(input.customerDisplayName);
  const role = await claimFulfillmentSlot({
    canonicalId: input.canonicalId,
    firstName,
    lastName,
    email: input.email,
    phoneNumber: input.phoneNumber,
  });

  if (role === "waiter") {
    const waited = await waitForExistingToken(input.orderIds, input.vin);
    if (waited) {
      return { success: true, token: waited };
    }
    return {
      success: false,
      error:
        "Your report is still being prepared. Please refresh this page in a moment.",
    };
  }

  console.info("[fulfillPurchase] ClearVIN report fetch once", {
    shopifyOrderId: input.canonicalId,
    vin: input.vin,
  });

  const report = await fetchClearVinReport(input.vin);
  if (!report.success || !report.html) {
    console.error("[fulfillPurchase] ClearVIN:", report.error);
    await db.payment
      .deleteMany({
        where: { orderID: input.canonicalId, status: "PENDING" },
      })
      .catch(() => {});
    return {
      success: false,
      error: report.error || "Failed to fetch ClearVIN report.",
    };
  }

  return persistAndEmail({
    html: report.html,
    vin: input.vin,
    clearvinReportId: report.reportId,
    customerEmail: input.email,
    customerDisplayName: input.customerDisplayName,
    transactionId: input.canonicalId,
    phoneNumber: input.phoneNumber,
    vehicleYear: input.vehicleYear,
    vehicleMake: input.vehicleMake,
    vehicleModel: input.vehicleModel,
  });
}

/**
 * Webhook fulfillment path: orders/paid is already HMAC-verified.
 * Reads VIN from Shopify order note/custom attributes.
 */
export async function fulfillShopifyOrderPaid(input: {
  orderId: string;
  attributes?: Record<string, unknown> | null;
  customerEmail?: string | null;
  customerName?: string | null;
}): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const orderId = input.orderId.trim();
  if (!orderId) {
    return { success: false, error: "Missing order id." };
  }

  let attributes = { ...(input.attributes ?? {}) };
  let email =
    (typeof input.customerEmail === "string" && input.customerEmail.trim()) ||
    metaString(attributes, "email");
  let displayName =
    (typeof input.customerName === "string" && input.customerName.trim()) ||
    `${metaString(attributes, "firstName")} ${metaString(attributes, "lastName")}`.trim();

  let vin = extractVin(attributes);
  let phoneNumber =
    metaString(attributes, "phoneNumber") ||
    metaString(attributes, "phone") ||
    "";

  // If webhook payload is thin, load the paid order from Admin API.
  if (!vin || !email || !phoneNumber) {
    const verified = await getPaidShopifyOrder(orderId);
    if (verified.ok) {
      attributes = { ...verified.order.attributes, ...attributes };
      vin = vin || extractVin(attributes);
      email = email || verified.order.email;
      displayName = displayName || verified.order.displayName;
      phoneNumber =
        phoneNumber ||
        metaString(attributes, "phoneNumber") ||
        metaString(attributes, "phone");
    }
  }

  if (!displayName) displayName = "Customer";

  return fulfillPurchaseFromOrderData({
    transactionId: orderIdFromGid(orderId) || orderId,
    checkoutId: orderId,
    vin,
    customerEmail: email,
    customerDisplayName: displayName,
    phoneNumber: phoneNumber || undefined,
    vehicleYear: metaString(attributes, "vehicleYear") || undefined,
    vehicleMake: metaString(attributes, "vehicleMake") || undefined,
    vehicleModel: metaString(attributes, "vehicleModel") || undefined,
  });
}

/**
 * Called after Shopify checkout return (/report-preview?order_id=…).
 * Verifies payment, fulfills if the webhook has not finished yet, returns token.
 */
export async function resolvePaidCheckout(
  orderId: string,
): Promise<
  | { success: true; token: string; vin: string }
  | { success: false; error: string }
> {
  const id = orderId.trim();
  if (!id) {
    return { success: false, error: "Missing order id." };
  }

  const verified = await getPaidShopifyOrder(id);
  if (!verified.ok) {
    return { success: false, error: verified.error };
  }

  const { order } = verified;
  const attributes = order.attributes as Record<string, unknown>;
  const vin = extractVin(attributes);
  const email = order.email || metaString(attributes, "email");
  const displayName =
    order.displayName ||
    `${metaString(attributes, "firstName")} ${metaString(attributes, "lastName")}`.trim() ||
    "Customer";

  if (!vin) {
    return {
      success: false,
      error: "VIN was not found on the paid Shopify order.",
    };
  }

  const result = await fulfillPurchaseFromOrderData({
    transactionId: order.legacyId || orderIdFromGid(order.id),
    checkoutId: order.id,
    vin,
    customerEmail: email,
    customerDisplayName: displayName,
    phoneNumber:
      metaString(attributes, "phoneNumber") ||
      metaString(attributes, "phone") ||
      undefined,
    vehicleYear: metaString(attributes, "vehicleYear") || undefined,
    vehicleMake: metaString(attributes, "vehicleMake") || undefined,
    vehicleModel: metaString(attributes, "vehicleModel") || undefined,
  });

  if (!result.success) {
    return result;
  }
  return { success: true, token: result.token, vin };
}
