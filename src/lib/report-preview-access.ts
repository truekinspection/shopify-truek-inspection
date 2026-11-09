/**
 * Secure report preview link lifetime (stored on `ReportPreviewToken.expiresAt`).
 * Keep in sync with token creation, validation, UI copy, and emails.
 */
export const REPORT_PREVIEW_ACCESS_MS = 30 * 24 * 60 * 60 * 1000;

export const REPORT_PREVIEW_ACCESS_LABEL = "30 days";

export function computeReportPreviewExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + REPORT_PREVIEW_ACCESS_MS);
}
