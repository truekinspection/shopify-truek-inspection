import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrueK Inspection",
  description:
    "Get a Certified Vehicle History Report for just $69. Get your report now. Original and Actual Vehicle History Reports. Guaranteed Safe Checkout.",
  verification: {
    google: "TBbs3ucxUopm3Q_jtWwm5llzVUZtSovZxUftwF8wMC8",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.truekinspection.com/#organization",
      name: "TrueK Inspection",
      legalName: "TrueK Inspection",
      url: "https://www.truekinspection.com/",
      logo: {
        "@type": "ImageObject",
        url: "https://www.truekinspection.com/logo.png",
      },
      description:
        "TrueK Inspection compiles vehicle history reports for used car buyers in the United States, drawing on licensed data from ClearVin and Black Book to cover title history, accident records, safety recalls, and salvage status.",
      email: "contact@truekinspection.com",
      areaServed: {
        "@type": "Country",
        name: "United States",
      },
      knowsAbout: [
        "Vehicle history reports",
        "VIN lookup",
        "DMV title history",
        "Vehicle safety recalls",
        "Salvage and junk title records",
        "Used car inspection",
      ],
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.truekinspection.com/#website",
      url: "https://www.truekinspection.com/",
      name: "TrueK Inspection",
      publisher: { "@id": "https://www.truekinspection.com/#organization" },
      inLanguage: "en-US",
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://www.truekinspection.com/#localbusiness",
      name: "TrueK Inspection",
      image: "https://www.truekinspection.com/logo.png",
      url: "https://www.truekinspection.com/",
      email: "contact@truekinspection.com",
      priceRange: "$69",
      areaServed: {
        "@type": "Country",
        name: "United States",
      },
      parentOrganization: {
        "@id": "https://www.truekinspection.com/#organization",
      },
    },
    {
      "@type": "Service",
      "@id": "https://www.truekinspection.com/#service",
      serviceType: "Vehicle History Report",
      name: "TrueK Vehicle History Report",
      provider: { "@id": "https://www.truekinspection.com/#organization" },
      areaServed: {
        "@type": "Country",
        name: "United States",
      },
      audience: {
        "@type": "Audience",
        audienceType: "Used car buyers",
      },
      offers: {
        "@type": "Offer",
        url: "https://www.truekinspection.com/#pricing",
        price: "69.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        description:
          "One vehicle report covering vehicle specification, DMV title history, safety recall status, online listing history, junk and salvage information, and accident information.",
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "US",
          returnPolicyCategory:
            "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 14,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
      },
    },
    {
      "@type": "WebPage",
      "@id": "https://www.truekinspection.com/#webpage",
      url: "https://www.truekinspection.com/",
      name: "TrueK Inspection — Vehicle History Reports",
      isPartOf: { "@id": "https://www.truekinspection.com/#website" },
      about: { "@id": "https://www.truekinspection.com/#organization" },
      primaryImageOfPage: "https://www.truekinspection.com/logo.png",
      description:
        "Get a certified vehicle history report for $69, covering DMV title history, safety recalls, and accident information.",
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.truekinspection.com/#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.truekinspection.com/",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="TBbs3ucxUopm3Q_jtWwm5llzVUZtSovZxUftwF8wMC8"
        />
        <Script
          id="truek-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <main>{children}</main>
        <Toaster />
        
        {/* Tawk.to Live Chat */}
        <Script
          id="tawk-to"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API = Tawk_API || {};
              var Tawk_LoadStart = new Date();

              (function () {
                var s1 = document.createElement("script");
                var s0 = document.getElementsByTagName("script")[0];

                s1.async = true;
                s1.src = "https://embed.tawk.to/6ac3e7d5791aba34cbeed7fb/1k46k36tu";
                s1.charset = "UTF-8";
                s1.setAttribute("crossorigin", "*");

                s0.parentNode.insertBefore(s1, s0);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
