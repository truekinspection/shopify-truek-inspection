import { createHmac, timingSafeEqual } from "crypto";

import { envValue } from "@/lib/env-value";

export function appOrigin(): string {
  const raw =
    envValue(process.env.NEXT_PUBLIC_APP_URL) ||
    envValue(process.env.NEXT_PUBLIC_URL) ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function getShopifyStoreDomain(): string {
  const domain = envValue(process.env.SHOPIFY_STORE_DOMAIN).replace(
    /^https?:\/\//,
    "",
  );
  if (!domain) {
    throw new Error("SHOPIFY_STORE_DOMAIN is not configured.");
  }
  return domain.replace(/\/+$/, "");
}

let cachedAdminToken: string | null = null;
let cachedAdminTokenExpiresAtMs = 0;
let adminTokenInFlight: Promise<string> | null = null;

/**
 * Dev Dashboard apps: exchange Client ID + secret for a short-lived Admin token
 * (client credentials grant, ~24h). Falls back to SHOPIFY_ADMIN_ACCESS_TOKEN if set
 * and client credentials are unavailable.
 */
export async function getShopifyAdminToken(): Promise<string> {
  const now = Date.now();
  if (cachedAdminToken && now < cachedAdminTokenExpiresAtMs - 60_000) {
    return cachedAdminToken;
  }
  if (adminTokenInFlight) return adminTokenInFlight;

  adminTokenInFlight = (async () => {
    try {
      const clientId = envValue(process.env.SHOPIFY_API_KEY);
      const clientSecret = envValue(process.env.SHOPIFY_API_SECRET);
      if (clientId && clientSecret) {
        const domain = getShopifyStoreDomain();
        const body = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        });
        const res = await fetch(
          `https://${domain}/admin/oauth/access_token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body,
          },
        );
        const json = (await res.json()) as {
          access_token?: string;
          expires_in?: number;
          error?: string;
          error_description?: string;
        };
        if (!res.ok || !json.access_token) {
          throw new Error(
            json.error_description ||
              json.error ||
              `Shopify client_credentials failed (HTTP ${res.status})`,
          );
        }
        const expiresInSec =
          typeof json.expires_in === "number" && json.expires_in > 0
            ? json.expires_in
            : 86_399;
        cachedAdminToken = json.access_token;
        cachedAdminTokenExpiresAtMs = Date.now() + expiresInSec * 1000;
        return cachedAdminToken;
      }

      const staticToken = envValue(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
      if (staticToken) return staticToken;

      throw new Error(
        "Shopify Admin auth not configured. Set SHOPIFY_API_KEY + SHOPIFY_API_SECRET (client credentials) or SHOPIFY_ADMIN_ACCESS_TOKEN.",
      );
    } finally {
      adminTokenInFlight = null;
    }
  })();

  return adminTokenInFlight;
}

export function getShopifyStorefrontToken(): string | null {
  const token = envValue(process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN);
  if (!token) return null;
  // Admin tokens (shpat_…) are not valid Storefront API tokens.
  if (token.startsWith("shpat_")) return null;
  return token;
}

export function getShopifyWebhookSecret(): string {
  const secret =
    envValue(process.env.SHOPIFY_WEBHOOK_SECRET) ||
    envValue(process.env.SHOPIFY_API_SECRET);
  if (!secret) {
    throw new Error(
      "SHOPIFY_WEBHOOK_SECRET / SHOPIFY_API_SECRET is not configured.",
    );
  }
  return secret;
}

/** Cart/order attribute key used for VIN (default: vin). */
export function getVinAttributeKey(): string {
  return envValue(process.env.SHOPIFY_VIN_ATTRIBUTE_KEY) || "vin";
}

export function getShopifyApiVersion(): string {
  return envValue(process.env.SHOPIFY_API_VERSION) || "2025-01";
}

export function toProductVariantGid(raw: string): string {
  const id = envValue(raw);
  if (!id) {
    throw new Error("SHOPIFY_PRODUCT_VARIANT_ID is empty.");
  }
  if (id.startsWith("gid://")) return id;
  // Numeric id only — strip any accidental non-digits from mis-copied env values.
  const numeric = id.replace(/[^\d]/g, "");
  if (!numeric) {
    throw new Error(
      "SHOPIFY_PRODUCT_VARIANT_ID must be a numeric variant id or gid://shopify/ProductVariant/…",
    );
  }
  return `gid://shopify/ProductVariant/${numeric}`;
}

export function toOrderGid(raw: string): string {
  const id = envValue(raw);
  if (!id) return "";
  if (id.startsWith("gid://")) return id;
  if (/^\d+$/.test(id)) return `gid://shopify/Order/${id}`;
  return id;
}

export function orderIdFromGid(gidOrNumeric: string): string {
  const raw = envValue(gidOrNumeric);
  if (!raw) return "";
  const match = raw.match(/Order\/(\d+)/);
  if (match?.[1]) return match[1];
  return raw;
}

export function getShopifyProductVariantId(): string {
  const id = envValue(process.env.SHOPIFY_PRODUCT_VARIANT_ID);
  if (!id) {
    throw new Error("SHOPIFY_PRODUCT_VARIANT_ID is not configured.");
  }
  return toProductVariantGid(id);
}

export function isShopifyConfigured(): boolean {
  const hasDomain = Boolean(envValue(process.env.SHOPIFY_STORE_DOMAIN));
  const hasVariant = Boolean(envValue(process.env.SHOPIFY_PRODUCT_VARIANT_ID));
  const hasClientCreds = Boolean(
    envValue(process.env.SHOPIFY_API_KEY) &&
      envValue(process.env.SHOPIFY_API_SECRET),
  );
  const hasStaticAdmin = Boolean(
    envValue(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
  );
  return hasDomain && hasVariant && (hasClientCreds || hasStaticAdmin);
}

type ShopifyGraphqlError = {
  message?: string;
};

type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: ShopifyGraphqlError[];
};

export async function shopifyAdminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const domain = getShopifyStoreDomain();
  const token = await getShopifyAdminToken();
  const version = getShopifyApiVersion();
  const res = await fetch(
    `https://${domain}/admin/api/${version}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const json = (await res.json()) as ShopifyGraphqlResponse<T>;
  if (!res.ok) {
    throw new Error(
      `Shopify Admin API HTTP ${res.status}: ${JSON.stringify(json.errors || json)}`,
    );
  }
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e) => e.message || "GraphQL error").join("; "),
    );
  }
  if (!json.data) {
    throw new Error("Shopify Admin API returned no data.");
  }
  return json.data;
}

async function shopifyStorefrontGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const domain = getShopifyStoreDomain();
  const token = getShopifyStorefrontToken();
  if (!token) {
    throw new Error("SHOPIFY_STOREFRONT_ACCESS_TOKEN is not configured.");
  }
  const version = getShopifyApiVersion();
  const res = await fetch(
    `https://${domain}/api/${version}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const json = (await res.json()) as ShopifyGraphqlResponse<T>;
  if (!res.ok) {
    throw new Error(
      `Shopify Storefront API HTTP ${res.status}: ${JSON.stringify(json.errors || json)}`,
    );
  }
  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e) => e.message || "GraphQL error").join("; "),
    );
  }
  if (!json.data) {
    throw new Error("Shopify Storefront API returned no data.");
  }
  return json.data;
}

export type ShopifyCheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  vin: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
};

export type CreatedShopifyCheckout = {
  /** Cart or draft order GraphQL id */
  checkoutId: string;
  draftOrderId: string | null;
  draftOrderLegacyId: string | null;
  checkoutUrl: string;
  method: "storefront_cart" | "draft_order";
};

function buildCheckoutAttributes(customer: ShopifyCheckoutCustomer) {
  const vinKey = getVinAttributeKey();
  return [
    { key: vinKey, value: customer.vin },
    { key: "firstName", value: customer.firstName },
    { key: "lastName", value: customer.lastName },
    { key: "email", value: customer.email },
    ...(customer.phoneNumber
      ? [{ key: "phoneNumber", value: customer.phoneNumber }]
      : []),
    ...(customer.vehicleYear
      ? [{ key: "vehicleYear", value: customer.vehicleYear }]
      : []),
    ...(customer.vehicleMake
      ? [{ key: "vehicleMake", value: customer.vehicleMake }]
      : []),
    ...(customer.vehicleModel
      ? [{ key: "vehicleModel", value: customer.vehicleModel }]
      : []),
  ];
}

async function createStorefrontCartCheckout(
  customer: ShopifyCheckoutCustomer,
): Promise<CreatedShopifyCheckout> {
  const variantId = getShopifyProductVariantId();
  const attributes = buildCheckoutAttributes(customer);

  const data = await shopifyStorefrontGraphql<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string | null } | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        lines: [{ quantity: 1, merchandiseId: variantId }],
        buyerIdentity: {
          email: customer.email,
        },
        attributes,
      },
    },
  );

  const payload = data.cartCreate;
  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors.map((e) => e.message).join("; "));
  }
  const cart = payload.cart;
  if (!cart?.id || !cart.checkoutUrl) {
    throw new Error("Shopify did not return a cart checkout URL.");
  }

  return {
    checkoutId: cart.id,
    draftOrderId: null,
    draftOrderLegacyId: null,
    checkoutUrl: cart.checkoutUrl,
    method: "storefront_cart",
  };
}

async function createDraftOrderCheckout(
  customer: ShopifyCheckoutCustomer,
): Promise<CreatedShopifyCheckout> {
  const variantId = getShopifyProductVariantId();
  const customAttributes = buildCheckoutAttributes(customer);

  const data = await shopifyAdminGraphql<{
    draftOrderCreate: {
      draftOrder: {
        id: string;
        legacyResourceId: string | null;
        invoiceUrl: string | null;
      } | null;
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(
    `#graphql
    mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          legacyResourceId
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        email: customer.email,
        note: `TrueK Inspection report — VIN ${customer.vin}`,
        tags: ["truek-inspection", "vehicle-history-report"],
        customAttributes,
        lineItems: [{ variantId, quantity: 1 }],
      },
    },
  );

  const payload = data.draftOrderCreate;
  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors.map((e) => e.message).join("; "));
  }
  const draft = payload.draftOrder;
  if (!draft?.id || !draft.invoiceUrl) {
    throw new Error("Shopify did not return a draft order invoice URL.");
  }

  return {
    checkoutId: draft.legacyResourceId || draft.id,
    draftOrderId: draft.id,
    draftOrderLegacyId: draft.legacyResourceId,
    checkoutUrl: draft.invoiceUrl,
    method: "draft_order",
  };
}

function isMissingDraftOrderScopeError(message: string): boolean {
  return /write_draft_orders|write_quick_sale|draftOrderCreate/i.test(message);
}

/**
 * Creates a Shopify checkout URL.
 * Prefers Storefront cart (no write_draft_orders). Falls back to Admin draft order.
 */
export async function createShopifyCheckout(
  customer: ShopifyCheckoutCustomer,
): Promise<CreatedShopifyCheckout> {
  const storefrontToken = getShopifyStorefrontToken();
  if (storefrontToken) {
    try {
      return await createStorefrontCartCheckout(customer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        "[shopify] Storefront cart checkout failed; trying draft order.",
        msg,
      );
    }
  }

  try {
    return await createDraftOrderCheckout(customer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingDraftOrderScopeError(msg)) {
      throw new Error(
        "Shopify app is missing `write_draft_orders` scope (draft checkout), and Storefront cart checkout also failed. Add `write_draft_orders` in the app, reinstall, refresh SHOPIFY_ADMIN_ACCESS_TOKEN — or set a valid SHOPIFY_STOREFRONT_ACCESS_TOKEN (Storefront API token, not the Admin shpat_ token).",
      );
    }
    throw e;
  }
}

export type ShopifyPaidOrder = {
  id: string;
  legacyId: string;
  email: string;
  displayName: string;
  financialStatus: string;
  attributes: Record<string, string>;
};

function attrsFromCustomAttributes(
  rows: Array<{ key?: string | null; value?: string | null }> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows || []) {
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Loads an order and confirms it is paid (or partially paid / authorized enough).
 */
export async function getPaidShopifyOrder(
  orderIdOrGid: string,
): Promise<
  | { ok: true; order: ShopifyPaidOrder }
  | { ok: false; error: string; status?: string }
> {
  const gid = toOrderGid(orderIdOrGid);
  if (!gid) {
    return { ok: false, error: "Missing Shopify order id." };
  }

  let lastStatus = "unknown";
  for (let attempt = 0; attempt < 8; attempt++) {
    const data = await shopifyAdminGraphql<{
      order: {
        id: string;
        legacyResourceId: string | null;
        name: string | null;
        email: string | null;
        displayFinancialStatus: string | null;
        customAttributes: Array<{ key: string; value: string }> | null;
        customer: {
          displayName: string | null;
          email: string | null;
        } | null;
      } | null;
    }>(
      `#graphql
      query GetOrder($id: ID!) {
        order(id: $id) {
          id
          legacyResourceId
          name
          email
          displayFinancialStatus
          customAttributes {
            key
            value
          }
          customer {
            displayName
            email
          }
        }
      }`,
      { id: gid },
    );

    const order = data.order;
    if (!order) {
      return { ok: false, error: "Shopify order not found." };
    }

    lastStatus = (order.displayFinancialStatus || "unknown").toUpperCase();
    const paidStatuses = new Set([
      "PAID",
      "PARTIALLY_PAID",
      "PARTIALLY_REFUNDED",
    ]);
    if (paidStatuses.has(lastStatus)) {
      const attributes = attrsFromCustomAttributes(order.customAttributes);
      const email =
        order.email?.trim() ||
        order.customer?.email?.trim() ||
        attributes.email ||
        "";
      const displayName =
        order.customer?.displayName?.trim() ||
        `${attributes.firstName || ""} ${attributes.lastName || ""}`.trim() ||
        "Customer";

      return {
        ok: true,
        order: {
          id: order.id,
          legacyId: order.legacyResourceId || orderIdFromGid(order.id),
          email,
          displayName,
          financialStatus: lastStatus,
          attributes,
        },
      };
    }

    if (lastStatus === "REFUNDED" || lastStatus === "VOIDED") {
      break;
    }

    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }

  return {
    ok: false,
    error: `Payment is not complete (status: ${lastStatus}).`,
    status: lastStatus,
  };
}

export function verifyShopifyWebhookHmac(
  rawBody: string,
  hmacHeader: string | null,
): boolean {
  if (!hmacHeader) return false;
  const secret = getShopifyWebhookSecret();
  const digest = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function noteAttributesToRecord(
  noteAttributes: Array<{ name?: string; value?: string }> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of noteAttributes || []) {
    const key = typeof row.name === "string" ? row.name.trim() : "";
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (key) out[key] = value;
  }
  return out;
}
