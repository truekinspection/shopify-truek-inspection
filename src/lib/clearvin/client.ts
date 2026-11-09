import { getClearVinBearerToken, invalidateClearVinToken } from "./auth";
import {
  CLEARVIN_BASE,
  CLEARVIN_FETCH_TIMEOUT_MS,
  isClearVinTestMode,
} from "./constants";
import { ClearVinApiError, parseClearVinErrorMessage } from "./errors";
import {
  extractHtmlFromReportJson,
  extractReportIdFromClearVinPayload,
} from "./extract-report-id";

export type ReportFormat = "html" | "pdf";

function tryParseJson(text: string): unknown | null {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

function isJsonErrorEnvelope(parsed: unknown): parsed is { status: "error"; message?: string } {
  if (parsed === null || typeof parsed !== "object") return false;
  const s = (parsed as Record<string, unknown>).status;
  return s === "error";
}

export type ClearVinRequestResult = {
  status: number;
  body: ArrayBuffer;
  contentType: string | null;
  textFallback: string;
};

async function rawClearVinGet(
  pathAndQuery: string,
  token: string,
  extraHeaders?: Record<string, string>,
): Promise<ClearVinRequestResult> {
  const url = `${CLEARVIN_BASE}${pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(CLEARVIN_FETCH_TIMEOUT_MS),
  });

  const buf = await response.arrayBuffer();
  const textFallback = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  if (!response.ok) {
    const message = parseClearVinErrorMessage(response.status, textFallback);
    throw new ClearVinApiError(response.status, message);
  }

  const parsed = tryParseJson(textFallback);
  if (isJsonErrorEnvelope(parsed)) {
    const message =
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : parseClearVinErrorMessage(400, textFallback);
    throw new ClearVinApiError(400, message);
  }

  return {
    status: response.status,
    body: buf,
    contentType: response.headers.get("content-type"),
    textFallback,
  };
}

/**
 * Authenticated GET to ClearVin. On HTTP 401, refreshes JWT once and retries.
 */
export async function clearVinGet(
  pathAndQuery: string,
  extraHeaders?: Record<string, string>,
): Promise<ClearVinRequestResult> {
  const token = await getClearVinBearerToken();
  try {
    return await rawClearVinGet(pathAndQuery, token, extraHeaders);
  } catch (e) {
    // Production JWTs expire; refresh once. Test mode uses a static token — no retry login.
    if (
      !isClearVinTestMode() &&
      e instanceof ClearVinApiError &&
      e.httpStatus === 401
    ) {
      invalidateClearVinToken();
      const fresh = await getClearVinBearerToken({ forceRefresh: true });
      return await rawClearVinGet(pathAndQuery, fresh, extraHeaders);
    }
    if (
      isClearVinTestMode() &&
      e instanceof ClearVinApiError &&
      e.httpStatus === 401
    ) {
      throw new ClearVinApiError(
        401,
        "ClearVIN rejected CLEARVIN_TEST_TOKEN (Bad authorization header). Update CLEARVIN_TEST_TOKEN from ClearVIN, or set CLEARVIN_ENV=production to use CLEARVIN_EMAIL / CLEARVIN_PASSWORD login.",
      );
    }
    throw e;
  }
}

/** Preview: vehicle summary, recalls, VIN spec (JSON). */
export async function clearVinPreview(vin: string): Promise<{ json: unknown; raw: string }> {
  const path = `/preview?vin=${encodeURIComponent(vin)}`;
  const res = await clearVinGet(path, {
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const raw = res.textFallback;
  const parsed = tryParseJson(raw);
  return { json: parsed ?? raw, raw };
}

export type ClearVinReportOptions =
  | { vin: string; format: ReportFormat; locale?: string }
  | { reportId: string; format: ReportFormat; locale?: string };

export type ClearVinReportResult = {
  body: ArrayBuffer;
  contentType: string | null;
  text: string;
  reportId?: string;
};

export async function clearVinReport(
  options: ClearVinReportOptions,
): Promise<ClearVinReportResult> {
  const params = new URLSearchParams();
  if ("vin" in options) {
    params.set("vin", options.vin);
  } else {
    params.set("reportId", options.reportId);
  }
  params.set("format", options.format);
  if (options.locale?.trim()) {
    params.set("locale", options.locale.trim());
  }

  const extraHeaders: Record<string, string> =
    options.format === "html"
      ? { Accept: "text/html,application/json;q=0.9,*/*;q=0.8", "Content-Type": "text/html" }
      : { Accept: "application/pdf,application/json;q=0.9,*/*;q=0.8" };

  const res = await clearVinGet(`/report?${params.toString()}`, extraHeaders);
  const parsed = tryParseJson(res.textFallback);

  if (parsed && isJsonErrorEnvelope(parsed)) {
    const message =
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : "ClearVin report failed.";
    throw new ClearVinApiError(400, message);
  }

  let textOut = res.textFallback;
  if (options.format === "html" && parsed && typeof parsed === "object") {
    const embedded = extractHtmlFromReportJson(parsed);
    if (embedded) {
      textOut = embedded;
    }
  }

  const reportId = extractReportIdFromClearVinPayload(textOut, parsed);

  return {
    body: res.body,
    contentType: res.contentType,
    text: textOut,
    reportId,
  };
}

export type StatsGranularity = "day" | "month" | "year";

export async function clearVinStats(params: {
  granularity: StatsGranularity;
  from?: string;
  to?: string;
}): Promise<{ json: unknown; raw: string }> {
  const search = new URLSearchParams();
  search.set("granularity", params.granularity);
  if (params.from?.trim()) search.set("from", params.from.trim());
  if (params.to?.trim()) search.set("to", params.to.trim());

  const res = await clearVinGet(`/stats?${search.toString()}`, {
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  const raw = res.textFallback;
  const parsed = tryParseJson(raw);
  return { json: parsed ?? raw, raw };
}
