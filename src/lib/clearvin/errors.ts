export type ClearVinHttpStatus =
  | 400
  | 401
  | 403
  | 404
  | 503
  | number;

export class ClearVinApiError extends Error {
  readonly httpStatus: ClearVinHttpStatus;
  readonly upstreamMessage: string;

  constructor(httpStatus: number, upstreamMessage: string) {
    super(upstreamMessage);
    this.name = "ClearVinApiError";
    this.httpStatus = httpStatus;
    this.upstreamMessage = upstreamMessage;
  }
}

type JsonEnvelope = {
  status?: string;
  message?: string;
  [key: string]: unknown;
};

function tryParseJson(text: string): unknown | null {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/**
 * Reads `message` from ClearVin JSON error bodies when present.
 */
export function parseClearVinErrorMessage(
  httpStatus: number,
  bodyText: string,
): string {
  const parsed = tryParseJson(bodyText);
  if (parsed && typeof parsed === "object" && parsed !== null) {
    const msg = (parsed as JsonEnvelope).message;
    if (typeof msg === "string" && msg.trim()) {
      return msg.trim();
    }
  }
  if (bodyText.trim()) {
    return bodyText.trim().slice(0, 500);
  }
  return defaultMessageForHttpStatus(httpStatus);
}

export function defaultMessageForHttpStatus(httpStatus: number): string {
  switch (httpStatus) {
    case 400:
      return "Invalid VIN format.";
    case 401:
      return "Authentication failed or token is invalid or expired.";
    case 403:
      return "Monthly limit or rate limit exceeded.";
    case 404:
      return "VIN not found.";
    case 503:
      return "ClearVin service is temporarily unavailable.";
    default:
      return `ClearVin request failed (${httpStatus}).`;
  }
}
