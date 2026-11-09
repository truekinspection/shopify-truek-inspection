import { NextResponse } from "next/server";

import { normalizeUsPhone } from "@/lib/phone-validation";
import {
  createShopifyCheckout,
  isShopifyConfigured,
} from "@/lib/shopify";

export async function POST(request: Request) {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Shopify is not configured. Set SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, and SHOPIFY_PRODUCT_VARIANT_ID.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phoneRaw =
      typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const phoneNumber = phoneRaw ? normalizeUsPhone(phoneRaw) || phoneRaw : "";
    const vin =
      typeof body.vin === "string" ? body.vin.trim().toUpperCase() : "";
    const vehicleYear =
      typeof body.vehicleYear === "string" ? body.vehicleYear.trim() : "";
    const vehicleMake =
      typeof body.vehicleMake === "string" ? body.vehicleMake.trim() : "";
    const vehicleModel =
      typeof body.vehicleModel === "string" ? body.vehicleModel.trim() : "";

    if (!firstName || !lastName || !email || !vin) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 },
      );
    }

    const checkout = await createShopifyCheckout({
      firstName,
      lastName,
      email,
      ...(phoneNumber ? { phoneNumber } : {}),
      vin,
      ...(vehicleYear ? { vehicleYear } : {}),
      ...(vehicleMake ? { vehicleMake } : {}),
      ...(vehicleModel ? { vehicleModel } : {}),
    });

    return NextResponse.json({
      success: true,
      checkoutId: checkout.checkoutId,
      draftOrderId: checkout.draftOrderId,
      checkoutUrl: checkout.checkoutUrl,
      method: checkout.method,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[create-checkout]", err.message || error);
    return NextResponse.json(
      {
        success: false,
        message:
          typeof err.message === "string" && err.message.trim()
            ? err.message
            : "Could not create checkout session.",
        details: err.message,
      },
      { status: 500 },
    );
  }
}
