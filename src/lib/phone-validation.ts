import { z } from "zod";

/** Digits only from a phone string. */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normalize to E.164-ish US form: +1XXXXXXXXXX.
 * Returns empty string if input has no digits.
 */
export function normalizeUsPhone(input: string): string {
  const digits = phoneDigits(input);
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return "";
}

/**
 * US NANP validation. Accepts common formats:
 * (555) 123-4567, 555-123-4567, 5551234567, +1 555 123 4567
 */
export function getUsPhoneValidationError(input: string): string | null {
  const raw = input.trim();
  if (!raw) {
    return "Phone number is required.";
  }
  const digits = phoneDigits(raw);
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (national.length !== 10) {
    return "Enter a valid US phone number (10 digits).";
  }
  // NANP: area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
    return "Enter a valid US phone number.";
  }
  return null;
}

export const zUsPhoneField = z
  .string()
  .trim()
  .min(1, { message: "Phone number is required." })
  .superRefine((value, ctx) => {
    const err = getUsPhoneValidationError(value);
    if (err) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }
  })
  .transform((value) => normalizeUsPhone(value));
