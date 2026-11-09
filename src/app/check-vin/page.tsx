"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/navbar";
import { FooterSection } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { verifyClearVinVin } from "@/actions/clearvin";
import { getVinValidationError, normalizeVin } from "@/lib/vin-validation";
import { REPORT_PRICE_DISPLAY } from "@/lib/constants";
import { useUserStore } from "@/store/user-store";

type ReportLoadState = "loading" | "ready" | "error";

type VehicleSummary = {
  year?: string;
  make?: string;
  model?: string;
  previewImageURL?: string;
};

function readVinFromClient(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("temp_vin")?.trim() ||
    useUserStore.getState().vnNumber?.trim() ||
    ""
  );
}

function readNameFromClient(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem("temp_name")?.trim();
  if (stored) return stored;
  const { firstName, lastName } = useUserStore.getState();
  return `${firstName} ${lastName}`.trim();
}

function readEmailFromClient(): string {
  return useUserStore.getState().email?.trim() || "";
}

function readPhoneFromClient(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("temp_phone")?.trim() ||
    useUserStore.getState().phoneNumber?.trim() ||
    ""
  );
}

function vehicleFromPreview(result: {
  year?: string;
  make?: string;
  model?: string;
  previewImageURL?: string;
}): VehicleSummary {
  return {
    year: result.year,
    make: result.make,
    model: result.model,
    previewImageURL: result.previewImageURL,
  };
}

export default function CheckVinPage() {
  const router = useRouter();
  const vinFromStore = useUserStore((s) => s.vnNumber);

  const [reportState, setReportState] = useState<ReportLoadState>("loading");
  const [reportError, setReportError] = useState("");
  const [activeVin, setActiveVin] = useState("");
  const [vehicle, setVehicle] = useState<VehicleSummary | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // ── Verify VIN with ClearVIN (no report HTML on this page) ────────────────
  useEffect(() => {
    const vin = readVinFromClient();
    if (!vin) {
      setReportError(
        "We could not find your VIN. Please go back to the home page and submit the form again.",
      );
      setReportState("error");
      return;
    }

    const normalizedVin = normalizeVin(vin);
    setActiveVin(normalizedVin);
    setReportState("loading");
    setReportError("");
    setVehicle(null);

    const clientVinError = getVinValidationError(normalizedVin);
    if (clientVinError) {
      setReportError(clientVinError);
      setReportState("error");
      return;
    }

    void (async () => {
      const result = await verifyClearVinVin(normalizedVin);
      if (result.success) {
        setVehicle(vehicleFromPreview(result));
        setReportState("ready");
        return;
      }
      setReportError(
        result.error ||
          "Could not verify this VIN with ClearVIN. Please check your VIN and try again.",
      );
      setReportState("error");
    })();
  }, [vinFromStore]);

  const retryVinVerification = () => {
    const vin = normalizeVin(readVinFromClient() || activeVin);
    if (!vin) return;
    const err = getVinValidationError(vin);
    if (err) {
      setReportError(err);
      setReportState("error");
      return;
    }
    setActiveVin(vin);
    setReportState("loading");
    setReportError("");
    void (async () => {
      const result = await verifyClearVinVin(vin);
      if (result.success) {
        setVehicle(vehicleFromPreview(result));
        setReportState("ready");
      } else {
        setReportError(
          result.error ||
            "Could not verify this VIN. Please check your VIN and try again.",
        );
        setReportState("error");
      }
    })();
  };

  const openShopifyCheckout = async () => {
    const vin = normalizeVin(readVinFromClient() || activeVin);
    if (!vin) {
      toast.error("VIN missing", {
        description: "Please start again from the home page.",
      });
      return;
    }

    const store = useUserStore.getState();
    const rawName = readNameFromClient();
    const parts = rawName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || store.firstName || "";
    const lastName = parts.slice(1).join(" ") || store.lastName || "";
    const email = readEmailFromClient() || store.email || "";
    const phoneNumber = readPhoneFromClient() || store.phoneNumber || "";

    if (!firstName || !lastName || !email) {
      toast.error("Missing contact details", {
        description:
          "Please go back to the home page and submit the report form with your name and email.",
      });
      return;
    }

    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          vin,
          vehicleYear: vehicle?.year,
          vehicleMake: vehicle?.make,
          vehicleModel: vehicle?.model,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        checkoutId?: string;
        checkoutUrl?: string;
        message?: string;
      };

      if (!res.ok || !json.checkoutUrl) {
        toast.error("Checkout unavailable", {
          description:
            typeof json.message === "string"
              ? json.message
              : "Could not start Shopify checkout. Please try again.",
        });
        setCheckoutBusy(false);
        return;
      }

      // Redirect to Shopify-hosted checkout (same post-pay fulfillment as before).
      window.location.assign(json.checkoutUrl);
    } catch (e) {
      console.error("[check-vin] Shopify checkout", e);
      toast.error("Checkout unavailable", {
        description:
          "Could not open Shopify checkout. Check Shopify env configuration and try again.",
      });
      setCheckoutBusy(false);
    }
  };

  const noVinError = reportState === "error" && !activeVin;

  const detailRows = [
    { label: "VIN", value: activeVin },
    vehicle?.year ? { label: "Year", value: vehicle.year } : null,
    vehicle?.make ? { label: "Make", value: vehicle.make } : null,
    vehicle?.model ? { label: "Model", value: vehicle.model } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="max-w-[1920px] mx-auto relative overflow-hidden min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 mt-24 max-w-2xl mx-auto px-4 py-10 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-custom_red font-semibold text-sm uppercase tracking-wide mb-2">
            <ShieldCheck className="h-5 w-5" />
            VIN verification
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Confirm your vehicle
          </h1>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto text-sm md:text-base">
            We verify your VIN with ClearVIN before checkout. After payment you
            will open the full interactive report on the next page.
          </p>
        </div>

        {noVinError && (
          <div className="max-w-xl mx-auto rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto mb-3" />
            <p className="text-gray-800 mb-4">{reportError}</p>
            <Button
              className="bg-custom_red hover:bg-red-700 text-white"
              onClick={() => router.push("/")}
            >
              Back to home
            </Button>
          </div>
        )}

        {reportState === "loading" && activeVin && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-12 w-12 text-custom_red animate-spin" />
            <p className="text-gray-700 font-medium">
              Verifying VIN {activeVin}…
            </p>
          </div>
        )}

        {reportState === "error" && activeVin && (
          <div className="max-w-xl mx-auto rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-custom_red mx-auto mb-3" />
            <p className="text-gray-800 mb-4">{reportError}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" onClick={retryVinVerification}>
                Try again
              </Button>
              <Button
                className="bg-custom_red hover:bg-red-700 text-white"
                onClick={() => router.push("/")}
              >
                Home
              </Button>
            </div>
          </div>
        )}

        {reportState === "ready" && vehicle !== null && (
          <div className="space-y-8">
            <div className="rounded-xl border border-green-200 bg-green-50/90 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="flex-1 space-y-2 text-left">
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    Your VIN is verified. Confirm this is your vehicle.
                  </p>
                  <p className="text-sm text-gray-600">
                    Lightweight summary from ClearVIN preview — not the full
                    history report.
                  </p>

                  {vehicle.previewImageURL ? (
                    <div className="mt-4 overflow-hidden rounded-lg border border-green-100 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vehicle.previewImageURL}
                        alt={
                          [vehicle.year, vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(" ") || "Vehicle preview"
                        }
                        className="h-auto max-h-64 w-full object-contain bg-gray-50"
                      />
                    </div>
                  ) : null}

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {detailRows.map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-lg border border-green-100 bg-white/80 px-4 py-3"
                      >
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900 break-all">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 py-2">
              <Button
                size="lg"
                className="w-full max-w-md bg-custom_red/80 hover:bg-custom_red/100 text-white text-lg py-6 rounded-xl shadow-lg"
                disabled={checkoutBusy}
                onClick={() => void openShopifyCheckout()}
              >
                {checkoutBusy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecting to checkout…
                  </span>
                ) : (
                  `Get Full Report for ${REPORT_PRICE_DISPLAY}`
                )}
              </Button>
              <p className="max-w-md text-center text-xs text-gray-500">
                NMVTIS-related records in this report are provided through
                licensed data providers, including ClearVin.{" "}
                <Link href="/terms#nmvtis-disclaimer" className="underline">
                  Read full terms
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </div>

      <FooterSection />
    </main>
  );
}
