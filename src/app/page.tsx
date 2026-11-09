import { Flags } from "@/components/flags";
import { WhyUs } from "@/components/why-us";
import { Navbar } from "@/components/navbar";
import { Pricing } from "@/components/pricing";
import { AboutUs } from "@/components/about-us";
import { FooterSection } from "@/components/footer";
import { Disclaimer } from "@/components/disclaimer";
import { HeroSection } from "@/components/hero-section";
import { ContactSection } from "@/components/contact-form";
import { InspectionReportForm } from "@/components/report-section";

export default function Home() {
  return (
    <main className="max-w-[1920px] mx-auto relative overflow-hidden">
      <Navbar />
      <HeroSection />
      <InspectionReportForm />
      <Flags />
      <AboutUs />
      <WhyUs />
      <Pricing />
      <ContactSection />
      <Disclaimer />
      <FooterSection /> 
    </main>
  );
}
