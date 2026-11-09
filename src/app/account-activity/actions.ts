"use server";

import {
  CLEARVIN_BASE,
  CLEARVIN_FETCH_TIMEOUT_MS,
  CLEARVIN_LOGIN_URL,
} from "@/lib/clearvin/constants";
import { normalizeClearVinStatsPayload } from "@/lib/clearvin/normalize-stats";

export type StatsGranularity = "day" | "month" | "year";

export type AccountActivityStatsRow = {
  date: string;
  count: number;
};

export type FetchAccountActivityStatsResult =
  | { success: true; data: AccountActivityStatsRow[] }
  | { success: false; error: string };

/** In-memory production JWT for account-activity stats only (never sent to client). */
let prodToken: string | null = null;
let prodTokenValidUntilMs = 0;
let prodLoginInFlight: Promise<string> | null = null;

const TOKEN_TTL_MS = 120 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function getProductionBearerToken(): Promise<string> {
  const now = Date.now();
  if (prodToken && now < prodTokenValidUntilMs) {
    return prodToken;
  }
  if (prodLoginInFlight) {
    return prodLoginInFlight;
  }

  prodLoginInFlight = (async () => {
    try {
      const email = process.env.CLEARVIN_EMAIL?.trim();
      const password = process.env.CLEARVIN_PASSWORD;
      if (!email || !password) {
        throw new Error(
          "ClearVIN production credentials are not configured (CLEARVIN_EMAIL / CLEARVIN_PASSWORD).",
        );
      }

      const response = await fetch(CLEARVIN_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(CLEARVIN_FETCH_TIMEOUT_MS),
      });

      const text = await response.text();
      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new Error("Invalid login response from ClearVIN.");
      }

      const data = body as {
        status?: string;
        token?: string;
        message?: string;
      };

      if (
        !response.ok ||
        data.status === "error" ||
        typeof data.token !== "string" ||
        !data.token
      ) {
        throw new Error(
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : "ClearVIN production login failed.",
        );
      }

      prodToken = data.token;
      prodTokenValidUntilMs = Date.now() + TOKEN_TTL_MS - TOKEN_REFRESH_BUFFER_MS;
      return prodToken;
    } finally {
      prodLoginInFlight = null;
    }
  })();

  return prodLoginInFlight;
}

/**
 * Fetches ClearVIN production account activity exclusively from:
 * GET /rest/vendor/stats?granularity=…
 * GET /rest/vendor/stats?granularity=…&from=…&to=…
 *
 * Always authenticates with production email/password (not the test token).
 * Stats only include credit-consuming production usage.
 */
export async function fetchClearVinProductionStats(params: {
  granularity: StatsGranularity;
  from?: string;
  to?: string;
}): Promise<FetchAccountActivityStatsResult> {
  const { granularity, from, to } = params;

  if (granularity !== "day" && granularity !== "month" && granularity !== "year") {
    return { success: false, error: "Granularity must be day, month, or year." };
  }

  const hasFrom = Boolean(from?.trim());
  const hasTo = Boolean(to?.trim());
  if (hasFrom !== hasTo) {
    return {
      success: false,
      error: "For a date range, both from and to (YYYY-MM-DD) are required.",
    };
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (hasFrom && hasTo) {
    if (!dateRe.test(from!.trim()) || !dateRe.test(to!.trim())) {
      return {
        success: false,
        error: "Parameters from and to must use YYYY-MM-DD format.",
      };
    }
  }

  try {
    const token = await getProductionBearerToken();
    const search = new URLSearchParams();
    search.set("granularity", granularity);
    if (hasFrom && hasTo) {
      search.set("from", from!.trim());
      search.set("to", to!.trim());
    }

    const url = `${CLEARVIN_BASE}/stats?${search.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(CLEARVIN_FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const message =
        json &&
        typeof json === "object" &&
        typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : `ClearVIN stats request failed (${response.status}).`;
      // Drop cached JWT on auth failure so the next call re-logins.
      if (response.status === 401) {
        prodToken = null;
        prodTokenValidUntilMs = 0;
      }
      return { success: false, error: message };
    }

    if (
      json &&
      typeof json === "object" &&
      (json as { status?: unknown }).status === "error"
    ) {
      const message =
        typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : "ClearVIN stats returned an error.";
      return { success: false, error: message };
    }

    const normalized = normalizeClearVinStatsPayload(json);
    return { success: true, data: normalized.data };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to reach ClearVIN stats API.";
    console.error("[account-activity] ClearVIN production stats:", e);
    return { success: false, error: message };
  }
}
