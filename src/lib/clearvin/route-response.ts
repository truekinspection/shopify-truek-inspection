import { NextResponse } from "next/server";
import { ClearVinApiError } from "./errors";

function mapUpstreamStatusToResponse(status: number): number {
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 503
  ) {
    return status;
  }
  return 502;
}

/**
 * Maps ClearVin failures to JSON `{ message }` for App Router handlers.
 */
export function jsonClearVinRouteError(e: unknown): NextResponse {
  if (e instanceof ClearVinApiError) {
    return NextResponse.json(
      { message: e.upstreamMessage },
      { status: mapUpstreamStatusToResponse(e.httpStatus) },
    );
  }
  console.error("[ClearVin API]", e);
  return NextResponse.json(
    { message: "Unexpected server error." },
    { status: 500 },
  );
}
