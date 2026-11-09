import {
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaXRay,
} from "react-icons/fa";

export const socialLinks = [
  {
    icon: FaGithub,
    href: "https://TrueKinspection.com",
    label: "GitHub",
  },
  {
    icon: FaLinkedin,
    href: "https://TrueKinspection.com",
    label: "LinkedIn",
  },
  {
    icon: FaFacebook,
    href: "https://TrueKinspection.com",
    label: "Facebook",
  },
  {
    icon: FaInstagram,
    href: "https://TrueKinspection.com",
    label: "Instagram",
  },
  { icon: FaXRay, href: "https://TrueKinspection.com", label: "Twitter" },
];

export const pricing = [
  {
    id: "10201",
    plan: "Our Plan",
    price: "$69",
    features: [
      "1 Vehicle Report",
      "Vehicle Specification",
      "DMV Title History",
      "Safety Recall Status",
      "Online Listing History",
      "Junk & Salvage Information",
      "Accident Information",
    ],
  },
];

/** Report checkout display price (Shopify product is priced in the Shopify admin). */
export const REPORT_PRICE_DISPLAY = "$69";
export const REPORT_PRICE_CENTS = 6900;
export const REPORT_CURRENCY = "usd";
