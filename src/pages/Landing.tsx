import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { GradientBackground } from "@/components/ui/bg-gredient";
import { useRef, useEffect, useState } from "react";

const Landing = () => {
  const ctaRef = useRef<HTMLDivElement>(null);
  const [gradientOpacity, setGradientOpacity] = useState(1);

  useEffect(() => {
    const ctaSection = ctaRef.current;
    if (!ctaSection) return;

    // Intersection Observer to detect when CTA Section enters viewport
    // Gradient fades out when CTA comes into view (meaning BenefitsSection has scrolled past)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // CTA section is entering viewport - fade out gradient
            setGradientOpacity(0);
          } else {
            // CTA section not visible yet - keep gradient visible
            setGradientOpacity(1);
          }
        });
      },
      {
        // Delay trigger until CTA section is substantially in viewport
        // Negative top margin means CTA must scroll up by this amount before triggering
        threshold: 0,
        rootMargin: "-400px 0px 0px 0px"
      }
    );

    observer.observe(ctaSection);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden">
      {/* Global Gradient Background with scroll-based fade */}
      <div
        style={{
          opacity: gradientOpacity,
          transition: 'opacity 1s ease-out 0.3s'
        }}
      >
        <GradientBackground
          gradientFrom="#000000"
          gradientTo="#1e293b"
          gradientPosition="50% 20%"
          gradientSize="150% 150%"
          gradientStop="30%"
        />
      </div>

      <Hero />
      <ShowcaseSection />
      <BenefitsSection />
      <div ref={ctaRef}>
        <CTASection />
      </div>

      {/* Footer spacer to ensure proper scroll ending */}
      <div className="h-20" />
    </main>
  );
};

export default Landing;
