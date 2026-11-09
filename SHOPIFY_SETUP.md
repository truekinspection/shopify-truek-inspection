# Shopify Setup Guide (TrueK Inspection)

This guide walks through everything you need to configure in **Shopify** so this Next.js app can replace **Polar checkout** with **Shopify checkout + Shopify Payments**, while keeping the rest of the flow the same:

```text
Home form → /check-vin (ClearVIN preview) → Shopify Checkout → pay
  → webhook + return to /report-preview → ClearVIN full report + email link
```

Shopify checkout code is already wired in this repo. Use this document to finish Admin + `.env` setup so payments work end-to-end.

---

## 1. What you are building

| Layer | Stays the same | Changes |
|--------|----------------|---------|
| VIN form + ClearVIN preview | Yes | — |
| Payment | — | Polar → Shopify |
| Full report + 30-day token email | Yes | Payment IDs become Shopify order IDs |

**Important:** Shopify Payments only works inside a Shopify store checkout. Your site creates a cart/checkout, the customer pays on Shopify, then your app fulfills the report.

**Recommended first approach:** redirect to Shopify-hosted checkout (simplest and most reliable). An embedded Checkout Kit can come later.

---

## 2. Prerequisites checklist

Before coding, you should have:

- [ ] A Shopify store (live or development store)
- [ ] **Shopify Payments** enabled and approved for your region
- [ ] Store domain known (example: `your-store.myshopify.com`)
- [ ] Ability to create a **custom app** in the store
- [ ] Public HTTPS URL for webhooks (production domain, or a tunnel like ngrok for local tests)
- [ ] Existing app env still working: `DATABASE_URL`, ClearVIN, Resend, `NEXT_PUBLIC_APP_URL`

---

## 3. Shopify Admin — Store & Payments

1. Open **Shopify Admin**.
2. Go to **Settings → Payments**.
3. Confirm **Shopify Payments** is activated and can accept cards.
4. Note your store’s myshopify domain:
   - **Settings → Domains**, or the URL while logged into admin  
   - Format: `xxxx.myshopify.com`  
   - This becomes `SHOPIFY_STORE_DOMAIN`.

Optional but useful:

- Use a **development store** first if you want safe test orders.
- Keep production store credentials separate from local/test credentials.

---

## 4. Create the product (replaces Polar product)

Polar used `POLAR_PRODUCT_ID`. Shopify needs a **product variant**.

1. Go to **Products → Add product**.
2. Suggested values:
   - **Title:** TrueK Vehicle History Report
   - **Description:** One vehicle history report (VIN-based)
   - **Price:** `69.00` USD (must match the price shown on the website)
3. Inventory / shipping:
   - Prefer **digital / no shipping** if your Shopify settings allow it.
   - If shipping is required by your store config, you may need a shipping profile or “mark as digital” options — otherwise checkout can ask for an address.
4. Save the product.
5. Open the product → scroll to **Variants**.
6. Copy the **Variant ID**:
   - In Admin UI: open the variant; the URL often contains the numeric id.
   - Or use Shopify GraphiQL / API later.
   - Store either:
     - numeric id: `12345678901234`
     - or GID: `gid://shopify/ProductVariant/12345678901234`

This becomes `SHOPIFY_PRODUCT_VARIANT_ID`.

### Price consistency

- Website copy (`$69`) is display-only.
- **Shopify product price is what the customer is charged.**
- Keep them identical.

---

## 5. Create a custom app (API access)

Your Next.js server needs permission to create checkouts/carts and read paid orders.

### 5.1 Create the app

1. Shopify Admin → **Settings → Apps and sales channels**.
2. Click **Develop apps** (enable custom app development if prompted).
3. **Create an app** — name it e.g. `TrueK Inspection Checkout`.
4. Open **Configuration** / **API credentials**.

### 5.2 Admin API scopes (minimum useful set)

Grant at least:

| Scope | Why |
|--------|-----|
| `read_products` | Confirm product/variant exists |
| `read_orders` | Verify paid orders + read VIN attributes after payment |
| **`write_draft_orders`** | **Required** for Admin draft-order checkout (invoice URL) |
| `write_orders` | Optional extras / order management |
| `write_checkouts` / `read_checkouts` | Older checkout APIs (if used) |

After changing scopes: **reinstall/update the app** on the store and refresh `SHOPIFY_ADMIN_ACCESS_TOKEN` if it rotates.

Prefer a real **Storefront API** token in `SHOPIFY_STOREFRONT_ACCESS_TOKEN` (cart checkout). Do not paste the Admin `shpat_` token there.

If you use **Storefront API Cart** instead of Admin Draft Orders, also configure Storefront API access (next section).

Exact scopes depend on the final integration style:

- **A) Storefront Cart → checkout URL (recommended for redirect)**  
  Storefront token + cart APIs; Admin token still useful for order verification + webhooks.
- **B) Admin Draft Order → invoice/checkout URL**  
  Admin token with `write_orders` / `read_orders`.

Either works. Prefer **A** for a normal storefront checkout experience.

### 5.3 Install the app & copy tokens

**Do not click the app name in the installed Apps list.**  
That opens the app’s **App URL** (often your website) and can redirect to something like:

```text
https://www.usa.truekinspection.com/?hmac=...&shop=xxxx.myshopify.com
```

That page is unrelated to copying API tokens. For an API-only custom app you only need **credentials**, not an embedded admin UI.

#### Correct path (credentials UI)

1. Settings → Apps and sales channels → **Develop apps** (top button).
2. Open **TrueK Inspection Checkout**.
3. **Configuration**: set Admin API scopes → Save.
4. **API credentials** → **Install app** (if not installed).
5. Copy what Shopify shows:

| Credential | Env var |
|------------|---------|
| Admin API access token (`shpat_...`) if shown / “Reveal token once” | `SHOPIFY_ADMIN_ACCESS_TOKEN` |
| API key / Client ID | `SHOPIFY_API_KEY` |
| API secret key / Client secret | `SHOPIFY_API_SECRET` (also used to verify webhooks) |

Treat these like passwords. Do not commit them to git.

#### If no permanent `shpat_...` token is shown (newer Shopify)

Some stores only give **Client ID** + **Client secret**. Generate an Admin access token with the client-credentials grant:

```bash
curl -X POST \
  "https://YOUR-STORE.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

Use the response’s `access_token` as `SHOPIFY_ADMIN_ACCESS_TOKEN`.

For this project’s store domain example:

```text
https://vmag8j-g3.myshopify.com/admin/oauth/access_token
```

#### Optional: stop the bad redirect

In the custom app → **Configuration** / app setup:

- Clear or avoid setting **App URL** to `https://www.usa.truekinspection.com` unless you intentionally build an embedded Shopify Admin app.
- This integration only needs Admin/Storefront API access from your Next.js server.

### 5.4 Storefront API (if using Cart checkout)

1. In the same custom app, enable **Storefront API**.
2. Scopes typically needed:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_write_checkouts` / cart-related Storefront scopes available in your Shopify version
3. Copy the **Storefront API access token**.

This becomes `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.

> If Shopify’s scope names differ slightly in your admin UI, enable the Storefront scopes that allow creating carts and generating checkout URLs for your product.

---

## 6. Pass VIN + customer data on the order (critical)

Today Polar stores VIN in custom fields + metadata so fulfillment can fetch the right ClearVIN report.

In Shopify you must attach the same data to the cart/order using **cart attributes** and/or **line item properties**, for example:

| Key | Example value |
|-----|----------------|
| `vin` | `1HGCM82633A004352` |
| `firstName` | `Jane` |
| `lastName` | `Doe` |
| `email` | `jane@example.com` |
| `vehicleYear` | `2018` |
| `vehicleMake` | `Honda` |
| `vehicleModel` | `Accord` |

### What you should verify manually once

After one test checkout:

1. Open **Orders** in Shopify Admin.
2. Open the test order.
3. Confirm attributes / properties show the VIN and name/email.

If VIN is missing on the paid order, automatic fulfillment will fail or become unreliable.

Env for the attribute key name (defaults to `vin`):

```env
SHOPIFY_VIN_ATTRIBUTE_KEY=vin
```

---

## 7. Webhooks (replaces Polar `order.paid`)

Webhooks tell your app “payment succeeded” even if the browser closes.

### 7.1 Create webhook

In the custom app (or **Settings → Notifications → Webhooks**):

1. Add webhook subscription:
   - **Event:** `orders/paid` (required)
   - Optional later: `orders/create`, `refunds/create`
2. **Format:** JSON
3. **URL:**
   - Production: `https://www.usa.truekinspection.com/api/webhook/shopify`
   - Local: `https://YOUR-TUNNEL-URL/api/webhook/shopify`

> The route `/api/webhook/shopify` will be added during code integration. Create the webhook URL to match that path.

### 7.2 Webhook signing secret

Shopify signs webhook bodies with HMAC using your app **API secret**.

Use:

```env
SHOPIFY_API_SECRET=...
# optional alias if you prefer a dedicated name:
SHOPIFY_WEBHOOK_SECRET=...
```

If only one secret exists, set both to the same value, or set `SHOPIFY_API_SECRET` and leave webhook secret equal to it in code later.

### 7.3 Local development tip

Shopify cannot call `localhost`. For local webhook tests:

1. Run a tunnel to your Next.js port.
2. Point the webhook URL at the tunnel.
3. Or test fulfillment via the browser return path first, then enable webhooks in staging/production.

---

## 8. After-payment return URL (replaces Polar success URL)

Polar used:

```text
/report-preview?checkout_id={CHECKOUT_ID}
```

Shopify equivalent (target after integration):

```text
https://YOUR_APP_ORIGIN/report-preview?order_id={SHOPIFY_ORDER_ID}
```

or another stable id your code can verify (order name / checkout token — final param decided in implementation).

### What to configure conceptually

1. Customer completes Shopify checkout.
2. They should be able to return to your app’s report page with an order identifier.
3. Your app verifies the order is **paid** via Admin API, then runs the same ClearVIN fulfillment as today.

Also keep:

```env
NEXT_PUBLIC_APP_URL=https://www.usa.truekinspection.com
NEXT_PUBLIC_URL=https://www.usa.truekinspection.com
```

These define the origin used for return links and email links.

---

## 9. End-to-end flow after Shopify is connected

```text
1. User submits form on /
2. /check-vin shows ClearVIN preview
3. User clicks Get Full Report ($69)
4. App creates Shopify cart/checkout with product variant + VIN attributes
5. Browser redirects to Shopify Checkout
6. Customer pays with Shopify Payments
7a. Shopify sends orders/paid → /api/webhook/shopify → fulfill report
7b. Browser returns to /report-preview?order_id=... → verify + fulfill (idempotent)
8. App fetches ClearVIN HTML, stores 30-day token, emails link, shows report
```

Idempotency rule (same as Polar): **one ClearVIN fetch per paid Shopify order**.

---

## 10. Environment variables

Add these to your local `.env` (never commit real secrets).

### Required for Shopify integration

```env
# --- Shopify ---
# Store hostname only (no https://)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com

# Admin API token from custom app install (shpat_...)
SHOPIFY_ADMIN_ACCESS_TOKEN=

# Storefront API token (required if using Storefront Cart checkout)
SHOPIFY_STOREFRONT_ACCESS_TOKEN=

# Custom app credentials (API secret verifies webhooks)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# Optional dedicated webhook secret (defaults to SHOPIFY_API_SECRET if unset)
SHOPIFY_WEBHOOK_SECRET=

# Product variant to sell (numeric id or GID)
SHOPIFY_PRODUCT_VARIANT_ID=

# Cart/order attribute key used for VIN (default: vin)
SHOPIFY_VIN_ATTRIBUTE_KEY=vin

# Optional: force API version pin once integration lands
# SHOPIFY_API_VERSION=2025-01
```

### Already required by the app (keep)

```env
# Database
DATABASE_URL=

# App URLs
NEXT_PUBLIC_URL=https://www.usa.truekinspection.com/
NEXT_PUBLIC_APP_URL=https://www.usa.truekinspection.com/

# Email (Resend)
RESEND_API_KEY=
RESEND_EMAIL=
OWNER_EMAIL=truekinspection@gmail.com

# ClearVIN
CLEARVIN_ENV=
CLEARVIN_TEST_TOKEN=
CLEARVIN_EMAIL=
CLEARVIN_PASSWORD=
```

### Polar vars (remove after Shopify code ships)

Keep them only while Polar is still live. After cutover, remove:

```env
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_WEBHOOK_SECRET=
POLAR_SERVER=
NEXT_PUBLIC_POLAR_ORGANIZATION=
POLAR_VIN_CUSTOM_FIELD_SLUG=
```

---

## 11. Where each Shopify value comes from

| Env var | Where to find it in Shopify |
|---------|-----------------------------|
| `SHOPIFY_STORE_DOMAIN` | Admin URL / Settings → Domains (`xxx.myshopify.com`) |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Custom app → API credentials → Admin API access token |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Custom app → Storefront API token |
| `SHOPIFY_API_KEY` | Custom app → API key |
| `SHOPIFY_API_SECRET` | Custom app → API secret key |
| `SHOPIFY_WEBHOOK_SECRET` | Same as API secret (or webhook-specific secret if shown) |
| `SHOPIFY_PRODUCT_VARIANT_ID` | Products → your report → variant id |
| `SHOPIFY_VIN_ATTRIBUTE_KEY` | Your choice; use `vin` unless you need another key |

---

## 12. Pre-integration setup checklist

Complete this before asking for code wiring:

- [ ] Shopify Payments works
- [ ] Product created at **$69**
- [ ] Variant ID copied into `.env`
- [ ] Custom app created + installed
- [ ] Admin token saved
- [ ] Storefront token saved (if using cart checkout)
- [ ] API key + API secret saved
- [ ] `orders/paid` webhook planned/created for `/api/webhook/shopify`
- [ ] `SHOPIFY_STORE_DOMAIN` set
- [ ] `NEXT_PUBLIC_APP_URL` points at the real site origin you will return to
- [ ] You understand customers will leave the site for Shopify checkout (redirect)

---

## 13. Suggested test plan (after code exists)

1. Start checkout from `/check-vin` with a known test VIN.
2. Confirm Shopify checkout shows the **$69** report product.
3. Complete a test payment.
4. In Shopify Admin → Orders, confirm **VIN attributes** are present.
5. Confirm webhook delivery succeeds (Shopify webhook logs).
6. Confirm `/report-preview` shows the full ClearVIN report.
7. Confirm the customer email contains the 30-day report link.
8. Replay/double-submit the same paid order path and confirm ClearVIN is **not** fetched twice.

---

## 14. Security notes

- Never commit `.env` or tokens to git.
- Rotate tokens if they leak.
- Webhook HMAC verification is mandatory before trusting `orders/paid`.
- Do not expose Admin API tokens to the browser — server only.
- Storefront tokens are still sensitive; prefer server-side cart creation when possible.

---

## 15. Code status (implemented)

Polar checkout has been removed. The app now uses Shopify draft-order checkout:

| Piece | Location |
|--------|----------|
| Create checkout | `POST /api/create-checkout` → Shopify draft order `invoiceUrl` |
| Pay button | `/check-vin` redirects to Shopify checkout |
| Webhook | `POST /api/webhook/shopify` (`orders/paid`) |
| Client resolve | `/report-preview?order_id=…` verifies paid order + fulfills |
| Shopify helpers | `src/lib/shopify.ts` |

ClearVIN, Prisma report tokens, and Resend delivery are unchanged.

### Flow

```text
/check-vin → POST /api/create-checkout → Shopify invoice/checkout URL
  → customer pays (Shopify Payments)
  → orders/paid webhook AND/OR /report-preview?order_id=…
  → ClearVIN HTML + 30-day token email + report page
```

---

## 16. What you still need to finish in Shopify / `.env`

Fill these (required for live checkout):

1. **`SHOPIFY_STORE_DOMAIN`** — e.g. `your-store.myshopify.com` (no `https://`)
2. **`SHOPIFY_ADMIN_ACCESS_TOKEN`** — install the Partner/custom app on the store, then copy the Admin API access token (`shpat_…`)
3. **`SHOPIFY_PRODUCT_VARIANT_ID`** — already set if you copied the variant id
4. **`SHOPIFY_API_SECRET`** — already set if you copied app secret (used for webhook HMAC)
5. Optional: set `SHOPIFY_WEBHOOK_SECRET` to the same value as `SHOPIFY_API_SECRET`

### Create the webhook

In the app or **Settings → Notifications → Webhooks**:

- Event: **`orders/paid`**
- URL: `https://www.usa.truekinspection.com/api/webhook/shopify`
- Format: JSON

### Return customers to the report page (recommended)

After payment, Shopify shows its thank-you / order status page. To auto-open TrueK’s report (same idea as Polar’s success URL), add a thank-you / order-status redirect to:

```text
https://www.usa.truekinspection.com/report-preview?order_id={{ order.id }}
```

Exact placement depends on your Shopify plan (Checkout Extensibility thank-you page, or legacy additional scripts). Until that redirect exists:

- Webhook still fulfills the report
- Customer still gets the **email link**
- You can also open `/report-preview?order_id=ORDER_ID` manually for testing

### Remove old Polar env vars

You can delete from `.env` once Shopify works:

```env
POLAR_ACCESS_TOKEN
POLAR_PRODUCT_ID
POLAR_WEBHOOK_SECRET
POLAR_SERVER
NEXT_PUBLIC_POLAR_ORGANIZATION
POLAR_VIN_CUSTOM_FIELD_SLUG
```

---

## 17. Done when…

1. Required Shopify env vars above are filled
2. App is **installed** on the store (Admin token works)
3. `orders/paid` webhook points at `/api/webhook/shopify`
4. A test purchase from `/check-vin` creates a Shopify order with VIN attributes
5. Report email + `/report-preview` work after payment
