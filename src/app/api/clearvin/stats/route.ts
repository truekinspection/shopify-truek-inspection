import { NextRequest, NextResponse } from "next/server";
import { clearVinStats, type StatsGranularity } from "@/lib/clearvin/client";
import { normalizeClearVinStatsPayload } from "@/lib/clearvin/normalize-stats";
import { jsonClearVinRouteError } from "@/lib/clearvin/route-response";

function parseGranularity(raw: string | null): StatsGranularity | null {
  if (raw === "day" || raw === "month" || raw === "year") return raw;
  return null;
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const g = parseGranularity(req.nextUrl.searchParams.get("granularity"));
  if (!g) {
    return NextResponse.json(
      { message: "Query parameter granularity must be day, month, or year." },
      { status: 400 },
    );
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if ((from && !to) || (!from && to)) {
    return NextResponse.json(
      { message: "For a date range, both from and to (YYYY-MM-DD) are required." },
      { status: 400 },
    );
  }
  if (from && to) {
    if (!dateRe.test(from) || !dateRe.test(to)) {
      return NextResponse.json(
        { message: "Parameters from and to must use YYYY-MM-DD format." },
        { status: 400 },
      );
    }
  }

  try {
    const { json } = await clearVinStats({
      granularity: g,
      from: from ?? undefined,
      to: to ?? undefined,
    });
    return NextResponse.json(normalizeClearVinStatsPayload(json));
  } catch (e) {
    return jsonClearVinRouteError(e);
  }
}
