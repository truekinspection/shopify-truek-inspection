"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { resolvePaidCheckout } from "@/actions/finalize-report-purchase";

type PageState = "loading" | "success" | "error";

const FLOW_ERROR_MESSAGES: Record<string, string> = {
  fetch_failed:
    "We could not retrieve your report from ClearVIN right after payment. You can try again from the VIN check page, or contact support.",
  store_failed:
    "Your payment went through, but we could not save your report session. Please contact support with your order confirmation.",
  unexpected:
    "Something went wrong while preparing your report. Please contact support if this continues.",
};

async function loadReportByToken(token: string): Promise<{
  html: string;
  vin: string;
}> {
  const res = await fetch(
    `/api/store-report?token=${encodeURIComponent(token)}`,
  );

  if (res.status === 410) {
    throw new Error(
      "This report link has expired. Secure links stay active for 30 days. Start a new request from the home page if you need another report.",
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error || `Server error: ${res.status}`);
  }

  const data = await res.json();
  return {
    html: data.html as string,
    vin: (data.vin as string) || "N/A",
  };
}

function ReportPreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const vin = searchParams.get("vin");
  // Shopify return: order_id. checkout_id kept as alias for older links.
  const orderId =
    searchParams.get("order_id") || searchParams.get("checkout_id");
  const flowError = searchParams.get("error");

  const [state, setState] = useState<PageState>("loading");
  const [reportHtml, setReportHtml] = useState<string>("");
  const [resolvedVin, setResolvedVin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resolveOnceRef = useRef<string | null>(null);

  // ── Resolve Shopify paid order return, or load by token ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Shopify success: /report-preview?order_id={ORDER_ID}
        if (orderId && !token) {
          if (resolveOnceRef.current === orderId) return;
          resolveOnceRef.current = orderId;
          const resolved = await resolvePaidCheckout(orderId);
          if (cancelled) return;
          if (!resolved.success) {
            throw new Error(resolved.error);
          }
          const previewPath = `/report-preview?token=${encodeURIComponent(resolved.token)}&vin=${encodeURIComponent(resolved.vin)}`;
          router.replace(previewPath);
          const loaded = await loadReportByToken(resolved.token);
          if (cancelled) return;
          setReportHtml(loaded.html);
          setResolvedVin(loaded.vin || resolved.vin);
          setState("success");
          return;
        }

        if (!token) {
          if (flowError) {
            setErrorMsg(
              FLOW_ERROR_MESSAGES[flowError] || FLOW_ERROR_MESSAGES.unexpected,
            );
            setState("error");
            return;
          }
          setErrorMsg(
            "No report token was provided. Open the link from your email, or return to the home page to start again.",
          );
          setState("error");
          return;
        }

        const loaded = await loadReportByToken(token);
        if (cancelled) return;
        setReportHtml(loaded.html);
        setResolvedVin(loaded.vin || vin || "N/A");
        setState("success");
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load report.";
        setErrorMsg(msg);
        setState("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, vin, orderId, flowError, router]);

  // ── Inject HTML into iframe and size iframe to full report height ────────
  // ClearVIN print/PDF uses the iframe layout viewport; a short iframe makes
  // "Save as PDF" / print capture only the first visible band. `allow-modals`
  // is required so sandboxed `window.print()` works reliably.
  useEffect(() => {
    if (state !== "success" || !iframeRef.current || !reportHtml) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(reportHtml);
    doc.close();

    const minHeightPx = () =>
      Math.max(
        Math.round(
          typeof window !== "undefined" ? window.innerHeight * 0.65 : 600,
        ),
        480,
      );

    let raf = 0;
    const applyHeight = () => {
      const root = doc.documentElement;
      const body = doc.body;
      const contentH = Math.max(
        root?.scrollHeight ?? 0,
        body?.scrollHeight ?? 0,
        root?.offsetHeight ?? 0,
        body?.offsetHeight ?? 0,
        minHeightPx(),
      );
      iframe.style.height = `${contentH}px`;
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(applyHeight);
    };

    schedule();

    const onWinResize = () => schedule();
    window.addEventListener("resize", onWinResize);

    const ro =
      typeof ResizeObserver !== "undefined" && doc.body
        ? new ResizeObserver(schedule)
        : null;
    ro?.observe(doc.body);

    doc.querySelectorAll("img").forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", schedule, { once: true });
      }
    });

    const t0 = window.setTimeout(schedule, 0);
    const t1 = window.setTimeout(schedule, 1000);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.removeEventListener("resize", onWinResize);
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [state, reportHtml]);

  return (
    <main className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-auto bg-gray-50">
      {/* ── Compact header (no download actions — report has its own controls) ── */}
      <div className="w-full shrink-0 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="w-full px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-custom_red shrink-0" />
            <span className="text-xs md:text-sm text-gray-400 uppercase tracking-widest font-semibold">
              Vehicle History Report
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold break-words">
            {state === "loading"
              ? "Fetching your report…"
              : state === "success"
                ? `Report for VIN: ${resolvedVin}`
                : "Report Unavailable"}
          </h1>
          {state === "success" && (
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Provided by ClearVIN · Powered by TrueK Inspection
            </p>
          )}
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-custom_red via-red-400 to-custom_red" />
      </div>

      {/* ── Content: full viewport width for embedded report ── */}
      <div className="flex flex-1 flex-col w-full min-h-0 min-w-0">
        {state === "loading" && (
          <div className="flex flex-1 flex-col items-center justify-center py-24 gap-6 px-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-gray-200 border-t-custom_red animate-spin" />
              <Loader2 className="h-8 w-8 text-custom_red absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-800">
                Preparing your report…
              </p>
              <p className="text-gray-500 mt-2 text-sm">
                This may take a few seconds. Please don&apos;t close this page.
              </p>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center py-20 gap-6 px-4">
            <div className="bg-red-50 rounded-full p-6 border-2 border-red-100">
              <AlertTriangle className="h-14 w-14 text-custom_red" />
            </div>
            <div className="text-center max-w-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Unable to Load Report
              </h2>
              <p className="text-gray-600 mb-2">{errorMsg}</p>
              <p className="text-gray-500 text-sm mb-6">
                Your payment was successful. If this issue persists, please
                contact us and we&apos;ll send the report directly to your
                email.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="mailto:truekinspection@gmail.com">
                  <Button className="bg-custom_red hover:bg-red-700 text-white px-8 py-5 rounded-lg w-full sm:w-auto">
                    Contact Support
                  </Button>
                </a>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 px-8 py-5 rounded-lg w-full sm:w-auto"
                  >
                    Return Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-1 flex-col w-full min-h-0 min-w-0">
            <div className="w-full border-b border-green-200 bg-green-50 px-4 py-3 md:px-6">
              <div className="flex items-start gap-3 max-w-none">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-green-800 text-sm font-medium leading-relaxed">
                  Your vehicle history report is ready. This page stays
                  available while your access link is valid (30 days from
                  purchase). Use the report&apos;s own toolbar to download or
                  print if you need a copy.
                </p>
              </div>
            </div>

            {/* Full-width iframe: no max-width, no side padding — report controls layout */}
            <div className="flex-1 w-full min-h-0 overflow-auto bg-white">
              <iframe
                ref={iframeRef}
                title="Vehicle History Report"
                className="block w-full border-0 bg-white"
                style={{
                  width: "100%",
                  minHeight: "min(70dvh, 640px)",
                }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ReportPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-50">
          <Loader2 className="h-8 w-8 text-custom_red animate-spin" />
        </div>
      }
    >
      <ReportPreviewContent />
    </Suspense>
  );
}
