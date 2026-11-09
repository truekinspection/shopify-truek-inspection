import { envValue } from "@/lib/env-value";
import {
  CLEARVIN_LOGIN_URL,
  CLEARVIN_TOKEN_REFRESH_BUFFER_MS,
  CLEARVIN_TOKEN_TTL_MS,
  CLEARVIN_FETCH_TIMEOUT_MS,
  isClearVinTestMode,
} from "./constants";
import { ClearVinApiError, parseClearVinErrorMessage } from "./errors";

type LoginOk = { status: "ok"; token: string };
type LoginErr = { status: "error"; message?: string };
type LoginResponse = LoginOk | LoginErr;

let cachedToken: string | null = null;
/** Epoch ms after which we must refresh (before true JWT expiry). */
let tokenValidUntilMs = 0;
let loginInFlight: Promise<string> | null = null;

function scheduleTokenExpiry(): void {
  tokenValidUntilMs =
    Date.now() + CLEARVIN_TOKEN_TTL_MS - CLEARVIN_TOKEN_REFRESH_BUFFER_MS;
}

export function __clearClearVinTokenCacheForTests(): void {
  cachedToken = null;
  tokenValidUntilMs = 0;
  loginInFlight = null;
}

function normalizeBearerToken(raw: string): string {
  return raw.replace(/^Bearer\s+/i, "").trim();
}

function readTestToken(): string {
  const token = normalizeBearerToken(
    envValue(process.env.CLEARVIN_TEST_TOKEN) ||
      envValue(process.env.CLEARVIN_TOKEN),
  );
  if (!token) {
    throw new ClearVinApiError(
      401,
      "ClearVin test token is not configured (CLEARVIN_TEST_TOKEN).",
    );
  }
  return token;
}

function readCredentials(): { email: string; password: string } {
  const email = envValue(process.env.CLEARVIN_EMAIL);
  // Password may intentionally contain `#` — do not strip inline comments here.
  const password = process.env.CLEARVIN_PASSWORD?.trim() ?? "";
  if (!email || !password) {
    throw new ClearVinApiError(
      401,
      "ClearVin credentials are not configured (CLEARVIN_EMAIL / CLEARVIN_PASSWORD).",
    );
  }
  return { email, password };
}

async function loginAndCacheToken(): Promise<string> {
  const { email, password } = readCredentials();

  const response = await fetch(CLEARVIN_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(CLEARVIN_FETCH_TIMEOUT_MS),
  });

  const text = await response.text();
  const message = parseClearVinErrorMessage(response.status, text);

  if (!response.ok) {
    cachedToken = null;
    tokenValidUntilMs = 0;
    throw new ClearVinApiError(response.status, message);
  }

  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new ClearVinApiError(
      401,
      message || "Invalid login response from ClearVin.",
    );
  }

  const data = body as LoginResponse;
  if (data.status === "error" || !("token" in data) || !data.token) {
    cachedToken = null;
    tokenValidUntilMs = 0;
    const errMsg =
      data.status === "error" && typeof data.message === "string"
        ? data.message
        : message;
    throw new ClearVinApiError(401, errMsg || "ClearVin login failed.");
  }

  cachedToken = data.token;
  scheduleTokenExpiry();
  return data.token;
}

/**
 * Returns a Bearer token for ClearVIN requests.
 *
 * Test / staging (`CLEARVIN_ENV=test` or non-production NODE_ENV):
 *   static test token from CLEARVIN_TEST_TOKEN — no login.
 *
 * Production:
 *   JWT from POST /rest/vendor/login, refreshed before the 120-minute expiry.
 */
export async function getClearVinBearerToken(options?: {
  forceRefresh?: boolean;
}): Promise<string> {
  if (isClearVinTestMode()) {
    return readTestToken();
  }

  const force = options?.forceRefresh === true;
  const now = Date.now();

  if (!force && cachedToken && now < tokenValidUntilMs) {
    return cachedToken;
  }

  if (loginInFlight) {
    return loginInFlight;
  }

  loginInFlight = (async () => {
    try {
      return await loginAndCacheToken();
    } finally {
      loginInFlight = null;
    }
  })();

  return loginInFlight;
}

/** Call after a ClearVin request returns 401 to drop cached JWT and retry login once. */
export function invalidateClearVinToken(): void {
  cachedToken = null;
  tokenValidUntilMs = 0;
  loginInFlight = null;
}
