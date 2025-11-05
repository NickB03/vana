import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { GradientBackground } from "@/components/ui/bg-gredient";
import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Landing Page - Static marketing page with gradient fade effect
 *
 * NOTE: This is a STATIC landing page that only controls gradient opacity.
 * It does NOT include scroll-based transition to the app interface.
 *
 * For the dynamic landing → app transition, see Home.tsx (/ route) which uses
 * the useScrollTransition hook to animate from landing content to chat interface.
 *
 * This page is intended for marketing/SEO purposes and uses CTA buttons to
 * navigate users to /auth or /signup routes.
 */
const Landing = () => {
  const location = useLocation();
  const ctaRef = useRef<HTMLDivElement>(null);
  const [gradientOpacity, setGradientOpacity] = useState(1);
  const ctaHasBeenVisibleRef = useRef(false);

  useEffect(() => {
    // Route guard: Only run CTA observer on /landing route
    if (location.pathname !== '/landing') {
      console.warn(`[Landing.tsx] CTA Observer skipped - not on /landing route (current: ${location.pathname})`);
      return;
    }

    const ctaElement = ctaRef.current;
    if (!ctaElement) return;

    // Log component mount for debugging
    console.log('[Landing.tsx] CTA Observer initialized on /landing route');

    // Intersection Observer watches the CTA section
    // Gradient fades when user has scrolled past the CTA section (CTA fully exits viewport)
    // No buffer needed - triggers as soon as CTA bottom edge scrolls above viewport top
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Check if CTA is intersecting AND its position
          const rect = entry.boundingClientRect;

          // Track if CTA has ever been visible (entered viewport)
          if (entry.isIntersecting) {
            ctaHasBeenVisibleRef.current = true;
          }

          // Debug logging with route context
          console.log('[Landing.tsx /landing] CTA Observer:', {
            isIntersecting: entry.isIntersecting,
            rectTop: rect.top,
            rectBottom: rect.bottom,
            windowHeight: window.innerHeight,
            ctaHasBeenVisible: ctaHasBeenVisibleRef.current,
            route: location.pathname
          });

          // Trigger gradient fade only when:
          // 1. CTA has been visible at least once (user scrolled to it)
          // 2. CTA is not intersecting (completely out of viewport)
          // 3. CTA bottom edge is above the viewport top (rect.bottom < 0)

          // Detailed condition checking
          const condition1 = ctaHasBeenVisibleRef.current;
          const condition2 = !entry.isIntersecting;
          const condition3 = rect.bottom < 0;
          const allConditionsMet = condition1 && condition2 && condition3;

          console.log('[Landing.tsx /landing] Condition Check:', {
            '1_ctaHasBeenVisible': condition1,
            '2_notIntersecting': condition2,
            '3_rectBottomNegative': condition3,
            'rectBottom': rect.bottom,
            'ALL_CONDITIONS_MET': allConditionsMet
          });

          if (allConditionsMet) {
            // User has scrolled past the CTA section - fade out gradient
            console.log('[Landing.tsx /landing] ✅ → Fading gradient OUT (CTA exited viewport)');
            setGradientOpacity(0);
          } else {
            // CTA is still visible or hasn't been reached yet - keep gradient
            console.log('[Landing.tsx /landing] ❌ → Keeping gradient VISIBLE');
            setGradientOpacity(1);
          }
        });
      },
      {
        // Trigger when CTA fully exits viewport
        // threshold: 0 means trigger when ANY part intersects or stops intersecting
        threshold: 0,
        rootMargin: "0px 0px 0px 0px"
      }
    );

    observer.observe(ctaElement);

    return () => {
      observer.disconnect();
      console.log('[Landing.tsx] CTA Observer disconnected');
    };
  }, [location.pathname]); // Only re-run if route changes

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

      <Hero />
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

export default Landing;
