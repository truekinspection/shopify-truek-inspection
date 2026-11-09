"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy route: all checkout and previews run on `/check-vin`.
 */
export default function PricingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/check-vin");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Loader2 className="h-10 w-10 text-custom_red animate-spin" />
      <p className="text-gray-600 text-sm">Taking you to VIN verification…</p>
    </div>
  );
}
