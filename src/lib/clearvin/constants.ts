import { envFirstToken } from "@/lib/env-value";

export const CLEARVIN_BASE = "https://www.clearvin.com/rest/vendor";

export const CLEARVIN_LOGIN_URL = `${CLEARVIN_BASE}/login`;

/** JWT lifetime per ClearVin documentation (minutes). */
export const CLEARVIN_TOKEN_TTL_MS = 120 * 60 * 1000;

/** Re-authenticate this many ms before nominal expiry to avoid mid-request expiry. */
export const CLEARVIN_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const CLEARVIN_FETCH_TIMEOUT_MS = 60_000;

/** 
 * Approved test VINs for ClearVIN test environment.
 * Requests with any other VIN fail in test mode.
 */
export const CLEARVIN_APPROVED_TEST_VINS = [
  "5TDYK3DC8DS290235",
  "2T1LR32E35C508537",
  "KNDJD733865514567",
  "WAUDG74F25N111998",
  "55SWF4JB3GU099875",
  "2C3CDZBT3FH700097",
  "1GC1KWEY3JF116856",
  "2C4RDGCG7CR359109",
  "JTEES41AX82061852",
  "1C4RJEAO0JC168184",
  "YV4902DZ5C2251209",
  "WDCGG8HB0BF559833",
  "WBAFR7C57CC811956",
  "5UXKR0C54F0K64366",
  "2C3CDXBG3JH232310",
  "3C6UR5FJ0JG298185",
  "4T1FZ1FB1LU051174",
  "1N6AD0EV1GN759974",
] as const;

export type ClearVinRuntimeEnv = "test" | "production";

/**
 * Resolves ClearVIN environment:
 * - `CLEARVIN_ENV=test|production` wins when set
 * - otherwise: production NODE_ENV → production; everything else → test
 */
export function getClearVinRuntimeEnv(): ClearVinRuntimeEnv {
  // Supports `CLEARVIN_ENV=test   # comment` (inline comments break naive trim).
  const explicit = envFirstToken(process.env.CLEARVIN_ENV);
  if (explicit === "test" || explicit === "staging") return "test";
  if (explicit === "production" || explicit === "prod") return "production";
  return process.env.NODE_ENV === "production" ? "production" : "test";
}

export function isClearVinTestMode(): boolean {
  return getClearVinRuntimeEnv() === "test";
}
