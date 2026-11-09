import { NextRequest, NextResponse } from "next/server";
import { clearVinPreview } from "@/lib/clearvin/client";
import { jsonClearVinRouteError } from "@/lib/clearvin/route-response";
import { getVinValidationError } from "@/lib/vin-validation";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin") ?? "";
  const vinError = getVinValidationError(vin);
  if (vinError) {
    return NextResponse.json({ message: vinError }, { status: 400 });
  }

  try {
    const { json } = await clearVinPreview(vin.trim().toUpperCase());
    return NextResponse.json(json);
  } catch (e) {
    return jsonClearVinRouteError(e);
  }
}
