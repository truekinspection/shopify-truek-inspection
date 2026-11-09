"use server";

import { clearVinPreview, clearVinReport } from "@/lib/clearvin/client";
import { ClearVinApiError } from "@/lib/clearvin/errors";
import {
  extractVehicleSummaryFromClearVinPreview,
  type ClearVinPreviewSummary,
} from "@/lib/clearvin/extract-preview-vehicle";
import { extractVehicleSummaryFromClearVinHtml } from "@/lib/clearvin-vehicle-summary";
import { extractReportIdFromClearVinPayload } from "@/lib/clearvin/extract-report-id";
import { getVinValidationError, normalizeVin } from "@/lib/vin-validation";

function mapClearVinFailure(e: unknown): string {
  if (e instanceof ClearVinApiError) {
    return e.upstreamMessage;
  }
  const message = e instanceof Error ? e.message : "Unknown error";
  console.error("[ClearVIN]", message);
  return "Failed to reach ClearVin. Please try again or contact support.";
}

/**
 * Fetches a full HTML vehicle history report from the ClearVin API (v2.0).
 * Auth is environment-aware (test token vs production login) on the server.
 */
export async function fetchClearVinReport(vin: string): Promise<{
  success: boolean;
  html?: string;
  reportId?: string;
  error?: string;
}> {
  const vinError = getVinValidationError(vin);
  if (vinError) {
    return { success: false, error: vinError };
  }

  const normalized = normalizeVin(vin);

  try {
    const result = await clearVinReport({ vin: normalized, format: "html" });
    const html = result.text?.trim() ?? "";
    if (!html) {
      return { success: false, error: "Empty report received from ClearVin." };
    }
    return {
      success: true,
      html,
      reportId:
        result.reportId || extractReportIdFromClearVinPayload(html, null),
    };
  } catch (e) {
    console.error("[ClearVIN] fetchClearVinReport:", e);
    return { success: false, error: mapClearVinFailure(e) };
  }
}

/**
 * Confirms ClearVin recognizes this VIN using the preview endpoint
 * (GET /rest/vendor/preview) and returns a lightweight vehicle summary.
 */
export async function verifyClearVinVin(vin: string): Promise<{
  success: boolean;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  style?: string;
  madeIn?: string;
  msrp?: string;
  previewImageURL?: string;
  imagesAmount?: number;
  auctionHistoryRecords?: number;
  recallCount?: number;
  error?: string;
}> {
  const vinError = getVinValidationError(vin);
  if (vinError) {
    return { success: false, error: vinError };
  }

  const normalized = normalizeVin(vin);

  try {
    const { json, raw } = await clearVinPreview(normalized);

    if (json && typeof json === "object") {
      const status = (json as Record<string, unknown>).status;
      if (status === "error") {
        const message = (json as Record<string, unknown>).message;
        return {
          success: false,
          error:
            typeof message === "string" && message.trim()
              ? message.trim()
              : "This VIN could not be verified. Please check your VIN and try again.",
        };
      }
    }

    const fromJson = extractVehicleSummaryFromClearVinPreview(json);
    const fromRaw: ClearVinPreviewSummary =
      typeof raw === "string" && raw.includes("<")
        ? extractVehicleSummaryFromClearVinHtml(raw)
        : {};

    return {
      success: true,
      year: fromJson.year ?? fromRaw.year,
      make: fromJson.make ?? fromRaw.make,
      model: fromJson.model ?? fromRaw.model,
      trim: fromJson.trim,
      engine: fromJson.engine,
      style: fromJson.style,
      madeIn: fromJson.madeIn,
      msrp: fromJson.msrp,
      previewImageURL: fromJson.previewImageURL,
      imagesAmount: fromJson.imagesAmount,
      auctionHistoryRecords: fromJson.auctionHistoryRecords,
      recallCount: fromJson.recallCount,
    };
  } catch (e) {
    console.error("[ClearVIN] verifyClearVinVin:", e);
    const mapped = mapClearVinFailure(e);
    const friendly =
      /not found|not valid|unable to generate/i.test(mapped)
        ? `${mapped} Please check your VIN and try again.`
        : mapped;
    return { success: false, error: friendly };
  }
}
