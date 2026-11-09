import { Resend } from "resend";

/** Resend `from` address with display name when env is a bare email. */
export function getResendFrom(): string {
  const raw = process.env.RESEND_EMAIL?.trim();
  if (!raw) return "TrueK Inspection <noreply@truekinspection.com>";
  if (raw.includes("<") && raw.includes(">")) return raw;
  return `TrueK Inspection <${raw}>`;
}

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function createResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) return null;
  return new Resend(apiKey);
}
