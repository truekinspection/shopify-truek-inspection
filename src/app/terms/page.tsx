import { FooterSection } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import React from "react";

export const metadata = {
    title: "Terms & Conditions | TrueK Inspection",
    description:
        "Read the Terms and Conditions of TrueK Inspection before using our services.",
};

export default function TermsAndConditions() {
    return (
        <main className="max-w-[1920px] mx-auto relative overflow-hidden">
            <Navbar />
            <div className="mt-24 max-w-6xl mx-auto px-4 py-10">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-custom_red to-red-600 rounded-lg p-16 mb-8">
                    <h1 className="text-4xl font-medium text-white text-center">
                        Terms &amp; Conditions
                    </h1>
                </div>

                {/* Content Section */}
                <div className="space-y-8">
                    <p className="text-gray-600">
                        These Terms &amp; Conditions govern your use of the TrueK Inspection
                        website and services. By accessing or using our services, you agree
                        to be bound by these terms. Please read them carefully.
                    </p>
                    <p className="text-gray-600">
                        <strong>Legal Business Name:</strong> TrueK Inspection
                    </p>

                    <div className="space-y-6">
                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                1. Use of Services
                            </h2>
                            <p className="text-gray-600">
                                TrueK Inspection provides vehicle history reports and related
                                digital products. You agree to use our services only for lawful
                                purposes and in accordance with these Terms &amp; Conditions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                2. Purchases and Payments
                            </h2>
                            <p className="text-gray-600">
                                All purchases are processed securely. By completing a purchase,
                                you agree to our{" "}
                                <Link
                                    href="/refund-policy"
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    Refund Policy
                                </Link>
                                , which provides a 14-day refund window on all orders.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                3. Intellectual Property
                            </h2>
                            <p className="text-gray-600">
                                All content, trademarks, and data on this website are the
                                property of TrueK Inspection or its licensors. You may not
                                reproduce, distribute, or create derivative works without our
                                express written permission.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                4. Disclaimer of Warranties
                            </h2>
                            <p className="text-gray-600">
                                TrueK Inspection provides its services &quot;as is&quot; without
                                any warranties, express or implied. We do not guarantee the
                                accuracy, completeness, or timeliness of vehicle history
                                information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                5. Limitation of Liability
                            </h2>
                            <p className="text-gray-600">
                                TrueK Inspection shall not be liable for any indirect,
                                incidental, special, or consequential damages arising out of
                                your use of our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                6. Privacy
                            </h2>
                            <p className="text-gray-600">
                                Your use of our services is also governed by our{" "}
                                <Link
                                    href="/privacy"
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    Privacy Policy
                                </Link>
                                , which is incorporated into these Terms by reference.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                7. Changes to Terms
                            </h2>
                            <p className="text-gray-600">
                                TrueK Inspection reserves the right to modify these Terms at
                                any time. Your continued use of the services after any changes
                                constitutes your acceptance of the new Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                8. Contact Us
                            </h2>
                            <p className="text-gray-600">
                                For any questions about these Terms &amp; Conditions, please{" "}
                                <Link
                                    href="/#contact"
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    contact us
                                </Link>
                                .
                            </p>
                        </section>

                        <section id="nmvtis-disclaimer">
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                9. NMVTIS Notice
                            </h2>
                            <p className="text-gray-600">
                                TrueK Inspection is not directly partnered with NMVTIS.
                                NMVTIS-related records shown in reports are provided
                                through licensed third-party data sources, including
                                ClearVin.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
            <FooterSection />
        </main>
    );
}
