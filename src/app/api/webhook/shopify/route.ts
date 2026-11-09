import { NextResponse } from "next/server";

import { fulfillShopifyOrderPaid } from "@/actions/finalize-report-purchase";
import {
  getVinAttributeKey,
  noteAttributesToRecord,
  verifyShopifyWebhookHmac,
} from "@/lib/shopify";

export const runtime = "nodejs";

/** Browser / health check — Shopify delivers webhooks via POST only. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Shopify webhook endpoint is live. Use POST for orders/paid.",
  });
}

type ShopifyOrderWebhook = {
  id?: number | string;
  admin_graphql_api_id?: string;
  email?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  financial_status?: string | null;
  note_attributes?: Array<{ name?: string; value?: string }>;
  customer?: {
    email?: string | null;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  try {
    if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
      console.error("[webhook/shopify] invalid HMAC");
      return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
    }
  } catch (e) {
    console.error("[webhook/shopify] HMAC config error", e);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const topic = request.headers.get("x-shopify-topic") || "";
  if (topic && topic !== "orders/paid") {
    return NextResponse.json({ ok: true, ignored: topic });
  }

  let order: ShopifyOrderWebhook;
  try {
    order = JSON.parse(rawBody) as ShopifyOrderWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId =
    (typeof order.admin_graphql_api_id === "string" &&
      order.admin_graphql_api_id.trim()) ||
    (order.id != null ? String(order.id) : "");

  if (!orderId) {
    console.error("[webhook/shopify] missing order id");
    return NextResponse.json({ ok: true, skipped: "no order id" });
  }

  const attributes = noteAttributesToRecord(order.note_attributes);
  const vinKey = getVinAttributeKey();
  const email =
    order.email?.trim() ||
    order.contact_email?.trim() ||
    order.customer?.email?.trim() ||
    attributes.email ||
    "";
  const phoneFromOrder =
    order.phone?.trim() ||
    order.customer?.phone?.trim() ||
    attributes.phoneNumber ||
    attributes.phone ||
    "";
  const customerName =
    `${order.customer?.first_name || attributes.firstName || ""} ${order.customer?.last_name || attributes.lastName || ""}`.trim() ||
    null;

  try {
    const result = await fulfillShopifyOrderPaid({
      orderId,
      attributes: {
        ...attributes,
        ...(attributes[vinKey] ? { vin: attributes[vinKey]! } : {}),
        ...(phoneFromOrder ? { phoneNumber: phoneFromOrder } : {}),
      },
      customerEmail: email,
      customerName,
    });
    if (!result.success) {
      console.error("[webhook/shopify] fulfill failed:", result.error);
    }
  } catch (e) {
    console.error("[webhook/shopify] orders/paid error", e);
  }

  // Always 200 after HMAC ok so Shopify does not endlessly retry on fulfill bugs.
  return NextResponse.json({ ok: true });
}
