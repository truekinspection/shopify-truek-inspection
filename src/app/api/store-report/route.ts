import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import db from "@/lib/db";
import { extractReportIdFromClearVinPayload } from "@/lib/clearvin/extract-report-id";
import { computeReportPreviewExpiry } from "@/lib/report-preview-access";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// ── POST /api/store-report ───────────────────────────────────────────────────
// Body: { html: string, vin?: string, clearvinReportId?: string }
// Returns: { token: string } — token valid for 30 days, reusable until expiry.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html, vin, clearvinReportId } = body as {
      html?: unknown;
      vin?: unknown;
      clearvinReportId?: unknown;
    };

    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing html" }, { status: 400 });
    }

    const token = generateToken();
    const expiresAt = computeReportPreviewExpiry();

    const reportIdStr =
      (typeof clearvinReportId === "string" && clearvinReportId.trim()
        ? clearvinReportId.trim()
        : null) ||
      extractReportIdFromClearVinPayload(html, null) ||
      null;

    await db.reportPreviewToken.create({
      data: {
        token,
        html,
        vin: typeof vin === "string" && vin.trim() ? vin.trim() : "N/A",
        clearvinReportId: reportIdStr,
        expiresAt,
      },
    });

    void db.reportPreviewToken
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});

    return NextResponse.json({ token });
  } catch (e) {
    console.error("[store-report] POST", e);
    return NextResponse.json(
      { error: "Failed to store report" },
      { status: 500 }
    );
  }
}

// ── GET /api/store-report?token=xxx ─────────────────────────────────────────
// Returns { html, vin } while token is valid (does not consume the token).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const row = await db.reportPreviewToken.findUnique({
      where: { token },
      select: { html: true, vin: true, expiresAt: true },
    });

    if (!row) {
      return NextResponse.json(
        { error: "Not found or expired" },
        { status: 404 }
      );
    }

    if (row.expiresAt < new Date()) {
      void db.reportPreviewToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ error: "Token expired" }, { status: 410 });
    }

    return NextResponse.json({ html: row.html, vin: row.vin });
  } catch (e) {
    console.error("[store-report] GET", e);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 }
    );
  }
}
