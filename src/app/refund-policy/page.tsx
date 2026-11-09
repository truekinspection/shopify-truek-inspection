import { FooterSection } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Refund Policy | TrueK Inspection",
  description:
    "TrueK Inspection refund policy. We offer a 14-day refund window on all purchases.",
};

export default function RefundPolicy() {
  return (
    <main className="max-w-[1920px] mx-auto relative overflow-hidden">
      <Navbar />
      {/* Wrapper to push content below Navbar */}
      <div className="mt-24 max-w-6xl mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-custom_red to-red-600 rounded-lg p-16 mb-8">
          <h1 className="text-4xl font-medium text-white text-center">
            Refund Policy
          </h1>
        </div>

        {/* Content Section */}
        <div className="space-y-8">
          <p className="text-gray-600">
            Thank you for choosing TrueK Inspection. Please read this Refund
            Policy carefully before making a purchase.
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">
                1. 14-Day Refund Window
              </h2>
              <p className="text-gray-600">
                You may request a full refund within <strong>14 days</strong>{" "}
                of the date of your purchase. To request a refund, contact us
                at{" "}
                <Link
                  href="/#contact"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  our contact page
                </Link>{" "}
                within that 14-day period with your order details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">
                2. How to Request a Refund
              </h2>
              <p className="text-gray-600">
                To initiate a refund, please contact TrueK Inspection within
                14 days of your purchase date. Include your order number and
                the email address used at checkout. We will process your refund
                request promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">
                3. Refund Processing
              </h2>
              <p className="text-gray-600">
                Once your refund request is received and approved, the refund
                will be issued to your original payment method. Please allow a
                few business days for the refund to appear in your account,
                depending on your payment provider.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">
                4. Contact Us
              </h2>
              <p className="text-gray-600">
                For any questions or concerns regarding this policy, please{" "}
                <Link
                  href="/#contact"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  contact us
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
      <FooterSection />
    </main>
  );
}
