import { FooterSection } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import React from "react";

export const metadata = {
    title: "Privacy Policy | TrueK Inspection",
    description:
        "Read the Privacy Policy of TrueK Inspection to understand how we collect, use, and protect your information.",
};

export default function PrivacyPolicy() {
    return (
        <main className="max-w-[1920px] mx-auto relative overflow-hidden">
            <Navbar />
            <div className="mt-24 max-w-6xl mx-auto px-4 py-10">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-custom_red to-red-600 rounded-lg p-16 mb-8">
                    <h1 className="text-4xl font-medium text-white text-center">
                        Privacy Policy
                    </h1>
                </div>

                {/* Content Section */}
                <div className="space-y-8">
                    <p className="text-gray-600">
                        TrueK Inspection (&quot;we&quot;, &quot;us&quot;, or
                        &quot;our&quot;) is committed to protecting your privacy. This
                        Privacy Policy explains how we collect, use, and safeguard your
                        information when you visit our website or use our services.
                    </p>

                    <div className="space-y-6">
                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                1. Information We Collect
                            </h2>
                            <p className="text-gray-600">
                                We may collect personal information that you voluntarily provide
                                to us, such as your name, email address, and payment details
                                when you make a purchase or contact us. We also collect
                                non-personal information such as browser type and pages visited
                                through cookies and analytics tools.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                2. How We Use Your Information
                            </h2>
                            <p className="text-gray-600">
                                We use the information we collect to process your orders,
                                deliver vehicle history reports, respond to inquiries, improve
                                our website, and comply with legal obligations. We do not sell
                                your personal information to third parties.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                3. Data Security
                            </h2>
                            <p className="text-gray-600">
                                We implement appropriate technical and organizational measures
                                to protect your personal information from unauthorized access,
                                disclosure, alteration, or destruction.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                4. Third-Party Services
                            </h2>
                            <p className="text-gray-600">
                                We may use third-party service providers (such as payment
                                processors) to help operate our website and deliver services.
                                These providers have access to your information only to perform
                                specific tasks on our behalf and are obligated to keep your
                                information confidential.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                5. Your Rights
                            </h2>
                            <p className="text-gray-600">
                                You have the right to access, correct, or request deletion of
                                your personal information. To exercise these rights, please
                                contact us through our{" "}
                                <Link
                                    href="/#contact"
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    contact page
                                </Link>
                                .
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                6. Changes to This Policy
                            </h2>
                            <p className="text-gray-600">
                                TrueK Inspection reserves the right to update this Privacy
                                Policy at any time. We will notify you of significant changes
                                by posting the new policy on this page.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-medium text-gray-800 mb-2">
                                7. Contact Us
                            </h2>
                            <p className="text-gray-600">
                                If you have any questions about this Privacy Policy, please{" "}
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
