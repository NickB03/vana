import { HeroV2 } from "@/components/landing/HeroV2";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { GradientBackground } from "@/components/ui/bg-gredient";
import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * LandingV2 - Alternate landing page with JSON-driven demo
 *
 * This is a copy of Landing.tsx that uses HeroV2 instead of Hero.
 * Allows A/B testing between the hardcoded demo and JSON-driven demo.
 *
 * Route: /landing-v2
 * SEO: noindex to prevent search engine indexing during testing
 */
const LandingV2 = () => {
  const location = useLocation();
  const ctaRef = useRef<HTMLDivElement>(null);
  const [gradientOpacity, setGradientOpacity] = useState(1);
  const ctaHasBeenVisibleRef = useRef(false);

  // Add noindex meta tag for testing (prevent search indexing)
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    // Route guard: Only run CTA observer on /landing-v2 route
    if (location.pathname !== '/landing-v2') {
      return;
    }

    const ctaElement = ctaRef.current;
    if (!ctaElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rect = entry.boundingClientRect;

          if (entry.isIntersecting) {
            ctaHasBeenVisibleRef.current = true;
          }

          const condition1 = ctaHasBeenVisibleRef.current;
          const condition2 = !entry.isIntersecting;
          const condition3 = rect.bottom < 0;
          const allConditionsMet = condition1 && condition2 && condition3;

          if (allConditionsMet) {
            setGradientOpacity(0);
          } else {
            setGradientOpacity(1);
          }
        });
      },
      {
        threshold: 0,
        rootMargin: "0px 0px 0px 0px"
      }
    );

    observer.observe(ctaElement);

    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  return (
      <main className="relative min-h-screen w-full overflow-x-hidden">
        {/* Global Gradient Background with scroll-based fade */}
        <div
          className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
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

        {/* Use HeroV2 with JSON-driven demo */}
        <HeroV2 />
        <ShowcaseSection />
        <BenefitsSection />
        <div ref={ctaRef}>
          <CTASection />
        </div>

        {/* Footer spacer to allow scrolling past CTA section for gradient fade */}
        <div className="h-[100vh]" />
      </main>
  );
};

export default LandingV2;
