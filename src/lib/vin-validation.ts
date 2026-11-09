import { z } from "zod";
import {
  CLEARVIN_APPROVED_TEST_VINS,
  isClearVinTestMode,
} from "@/lib/clearvin/constants";

/** Standard US VIN length (1981+). */
export const VIN_LENGTH = 17;

/** Letters I, O, Q are not used in VINs. */
const VIN_CHARSET = /^[A-HJ-NPR-Z0-9]{17}$/;

const APPROVED_TEST_VIN_SET = new Set<string>(CLEARVIN_APPROVED_TEST_VINS);

export function normalizeVin(vin: string): string {
  return vin.trim().toUpperCase();
}

export function isApprovedClearVinTestVin(vin: string): boolean {
  return APPROVED_TEST_VIN_SET.has(normalizeVin(vin));
}

/**
 * Returns a user-facing error message if the VIN is invalid, or null if valid.
 * In ClearVIN test mode, only approved documentation test VINs are accepted.
 */
export function getVinValidationError(vin: string): string | null {
  const v = normalizeVin(vin);
  if (!v) {
    return "VIN number is required.";
  }
  if (v.length !== VIN_LENGTH) {
    return `VIN must be exactly ${VIN_LENGTH} characters.`;
  }
  if (!VIN_CHARSET.test(v)) {
    return "Invalid VIN format. Use 17 characters; letters I, O, and Q are not allowed.";
  }
  if (isClearVinTestMode() && !isApprovedClearVinTestVin(v)) {
    return "This VIN is not available in ClearVIN test mode. Use one of the approved test VINs from the ClearVIN documentation.";
  }
  return null;
}

/** Zod field for forms that collect a VIN (same rules as server-side checks). */
export const zVinField = z.string().superRefine((val, ctx) => {
  const msg = getVinValidationError(val);
  if (msg) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  }
});
