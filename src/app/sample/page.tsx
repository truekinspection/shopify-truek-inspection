import Link from "next/link";

import { FooterSection } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export const metadata = {
  title: "Sample Report | TrueK Inspection",
  description: "Preview a sample vehicle history report.",
};

export default function SamplePage() {
  return (
    <main className="max-w-[1920px] mx-auto relative overflow-hidden min-h-screen">
      <Navbar />
      <section className="mt-24 max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Sample Report
          </h1>
          <p className="text-gray-600 mt-2">
            This is a sample copy of a vehicle report in PDF format.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <iframe
            title="Sample vehicle report PDF"
            src="/sample-report.pdf"
            className="h-[70vh] w-full"
          />
        </div>

        <p className="text-sm text-gray-500 mt-4">
          If the PDF does not load in your browser,{" "}
          <Link href="/sample-report.pdf" className="underline">
            open the sample report directly
          </Link>
          .
        </p>
      </section>
      <FooterSection />
    </main>
  );
}
