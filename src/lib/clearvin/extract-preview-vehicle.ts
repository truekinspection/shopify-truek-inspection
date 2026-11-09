import { extractVehicleSummaryFromClearVinHtml } from "@/lib/clearvin-vehicle-summary";

export type ClearVinPreviewSummary = {
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
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

function deepFindVehicle(obj: unknown, depth = 0): { year?: string; make?: string; model?: string } {
  if (depth > 12 || obj === null || obj === undefined) return {};

  if (typeof obj === "string") {
    if (obj.includes("<html") || obj.includes("<!DOCTYPE")) {
      return extractVehicleSummaryFromClearVinHtml(obj);
    }
    return {};
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepFindVehicle(item, depth + 1);
      if (found.year || found.make || found.model) return found;
    }
    return {};
  }

  if (typeof obj !== "object") return {};

  const rec = obj as Record<string, unknown>;

  const year =
    pickString(rec, [
      "modelYear",
      "ModelYear",
      "year",
      "Year",
      "vehicleYear",
      "VehicleYear",
    ]) ?? undefined;
  const make =
    pickString(rec, [
      "make",
      "Make",
      "manufacturer",
      "Manufacturer",
      "vehicleMake",
      "VehicleMake",
    ]) ?? undefined;
  const model =
    pickString(rec, ["model", "Model", "vehicleModel", "VehicleModel"]) ?? undefined;

  if (year || make || model) {
    return { year, make, model };
  }

  for (const v of Object.values(rec)) {
    const found = deepFindVehicle(v, depth + 1);
    if (found.year || found.make || found.model) return found;
  }

  return {};
}

/**
 * Best-effort vehicle + preview metadata from ClearVin preview JSON.
 * Matches documented shape: result.previewImageURL, imagesAmount,
 * auctionHistoryRecords, recalls[], vinSpec.
 */
export function extractVehicleSummaryFromClearVinPreview(
  payload: unknown,
): ClearVinPreviewSummary {
  if (typeof payload === "string") {
    return extractVehicleSummaryFromClearVinHtml(payload);
  }
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const root = payload as Record<string, unknown>;
  const result =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : root;

  const vinSpec =
    result.vinSpec && typeof result.vinSpec === "object"
      ? (result.vinSpec as Record<string, unknown>)
      : result;

  const fromDecode = deepFindVehicle(result);
  const fromRoot = deepFindVehicle(root);

  const year =
    pickString(vinSpec, ["year", "Year", "modelYear", "ModelYear"]) ??
    fromDecode.year ??
    fromRoot.year;
  const make =
    pickString(vinSpec, ["make", "Make"]) ?? fromDecode.make ?? fromRoot.make;
  const model =
    pickString(vinSpec, ["model", "Model"]) ??
    fromDecode.model ??
    fromRoot.model;

  const recalls = result.recalls;
  const recallCount = Array.isArray(recalls) ? recalls.length : undefined;

  return {
    year,
    make,
    model,
    trim: pickString(vinSpec, ["trim", "Trim"]),
    engine: pickString(vinSpec, ["engine", "Engine"]),
    style: pickString(vinSpec, ["style", "Style"]),
    madeIn: pickString(vinSpec, ["madeIn", "MadeIn", "made_in"]),
    msrp: pickString(vinSpec, ["msrp", "MSRP"]),
    previewImageURL: pickString(result, [
      "previewImageURL",
      "previewImageUrl",
      "preview_image_url",
      "imageUrl",
      "imageURL",
    ]),
    imagesAmount: pickNumber(result, ["imagesAmount", "images_amount", "imagesCount"]),
    auctionHistoryRecords: pickNumber(result, [
      "auctionHistoryRecords",
      "auction_history_records",
      "auctionRecords",
    ]),
    recallCount,
  };
}
