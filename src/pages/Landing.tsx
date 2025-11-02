import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { GradientBackground } from "@/components/ui/bg-gredient";

const Landing = () => {
  return (
    <main className="relative min-h-screen">
      {/* Global Gradient Background for entire landing page */}
      <GradientBackground
        gradientFrom="#000000"
        gradientTo="#1e293b"
        gradientPosition="50% 20%"
        gradientSize="150% 150%"
        gradientStop="30%"
      />

      <Hero />
      <ShowcaseSection />
      <BenefitsSection />
      <CTASection />
    </main>
  );
};

export default Landing;
