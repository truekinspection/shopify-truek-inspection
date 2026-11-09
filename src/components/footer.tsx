import Link from "next/link";
import { Mail } from "lucide-react";

export const FooterSection = () => {
  return (
    <footer className="bg-neutral-900 px-4 py-16 text-white">
      <div className="container mx-auto">
        <div className="grid gap-12 md:grid-cols-5">
          {/* Logo and Description */}
          <div className="space-y-6 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                <span className="text-custom_red">T</span>rueK Inspection
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-300">
              Get detailed VIN reports, vehicle specifications, and safety
              updates with Autoscheckup. Proudly serving customers across the
              United States.
            </p>
          </div>

          {/* Company Links */}
          <div className="md:col-span-1">
            <h3 className="mb-6 text-lg font-semibold">Company</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li>
                <Link href="/#about-us" className="hover:text-white">
                  About us
                </Link>
              </li>

              <li>
                <Link href="/pricing" className="hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-white">
                  Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Useful Links */}
          <div className="md:col-span-1">
            <h3 className="mb-6 text-lg font-semibold">Useful Links</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li>
                <Link href="/#whyus" className="hover:text-white">
                  Why us
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-white">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/sample" className="hover:text-white">
                  Sample report
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="md:col-span-1">
            <h3 className="mb-6 text-lg font-semibold">Legal</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="md:col-span-1">
            <h3 className="mb-6 text-lg font-semibold">Contact</h3>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail className="h-4 w-4" />
              <a
                href="mailto:autoscheckup@gmail.com"
                className="hover:text-white"
              >
                TrueKinspection@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 text-center text-sm text-gray-300">
          Copyright © 2018 TrueK Inspection. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
