export type NormalizedStatsRow = {
  date: string;
  count: number;
};

export type NormalizedStatsResponse = {
  status: "ok";
  data: NormalizedStatsRow[];
  totalCount?: number;
};

/**
 * ClearVIN docs show `{ status, data: [{ count, date }] }`, but the live
 * vendor API returns `{ "/report": { totalCount, counts: [{ value, date }] } }`
 * with dates like `YYYYMMDD`. Normalize both shapes for the app UI.
 */
export function normalizeClearVinStatsPayload(
  payload: unknown,
): NormalizedStatsResponse {
  if (!payload || typeof payload !== "object") {
    return { status: "ok", data: [] };
  }

  const root = payload as Record<string, unknown>;

  // Documented shape
  if (Array.isArray(root.data)) {
    const data = root.data
      .map((item) => rowFromUnknown(item))
      .filter(Boolean) as NormalizedStatsRow[];
    return { status: "ok", data };
  }

  // Live vendor shape
  const reportBucket = root["/report"];
  if (reportBucket && typeof reportBucket === "object") {
    const bucket = reportBucket as Record<string, unknown>;
    const counts = Array.isArray(bucket.counts) ? bucket.counts : [];
    const data = counts
      .map((item) => rowFromUnknown(item))
      .filter(Boolean) as NormalizedStatsRow[];
    const totalCount =
      typeof bucket.totalCount === "number" ? bucket.totalCount : undefined;
    return { status: "ok", data, totalCount };
  }

  return { status: "ok", data: [] };
}

function rowFromUnknown(item: unknown): NormalizedStatsRow | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  const rawCount = row.count ?? row.value;
  const count =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string"
        ? Number(rawCount)
        : NaN;
  if (!Number.isFinite(count)) return null;

  const rawDate = row.date;
  if (typeof rawDate !== "string" || !rawDate.trim()) return null;

  return { date: formatStatsDate(rawDate.trim()), count };
}

/** Accepts `YYYY-MM-DD` or `YYYYMMDD` → `YYYY-MM-DD`. */
function formatStatsDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}
