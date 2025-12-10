import { Check } from "lucide-react";
import { motion } from "motion/react";
import { fadeInUp } from "@/utils/animationConstants";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";
import {
  StreamingCodeIllustration,
  InteractiveArtifactsIllustration,
  SecurityIllustration,
} from "./BenefitIllustrations";
import { useEffect, useRef, useState } from "react";

export const BenefitsSection = () => {
  // Lazy mount illustrations when section is near viewport
  const [shouldMountIllustrations, setShouldMountIllustrations] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMountIllustrations(true);
          observer.disconnect(); // Only mount once
        }
      },
      { rootMargin: '200px' } // Load 200px before visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={combineSpacing("relative w-full", SECTION_SPACING.full)}>

      <div className="container max-w-6xl mx-auto w-full relative z-10">
        <motion.div
          className="text-center space-y-4 mb-16"
          {...fadeInUp}
        >
          <h2 className={cn(TYPOGRAPHY.HEADING.lg.full, "font-bold")}>
            What is Vana?
          </h2>
          <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground max-w-2xl mx-auto")}>
            A production-grade AI development platform powered by a multi-model architecture, transforming natural language into interactive code, games, dashboards, and visualizations in real-time.
          </p>
        </motion.div>

        <div className="space-y-12 sm:space-y-16 lg:space-y-20">
          {/* Benefit 1: Multi-Model AI Architecture */}
          <motion.div
            className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center"
            {...fadeInUp}
          >
            <div className="space-y-3 sm:space-y-4">
              <h3 className={cn(TYPOGRAPHY.HEADING.md.full, "font-bold")}>Multi-Model AI Engine</h3>
              <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground")}>
                Vana orchestrates multiple specialized AI models—Gemini 2.5 Flash Lite for chat, GLM-4.6 for complex artifact generation, and GLM-4.5-Air for real-time status updates.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>GLM-4.6 thinking mode for deep reasoning</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Parallel processing with AI commentator</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Smart context management (up to 1M tokens)</span>
                </li>
              </ul>
            </div>
            <div className="order-first lg:order-last">
              {shouldMountIllustrations ? (
                <StreamingCodeIllustration />
              ) : (
                <div className="aspect-video bg-muted/20 animate-pulse rounded-lg" />
              )}
            </div>
          </motion.div>

          {/* Benefit 2: Modern Full-Stack Architecture */}
          <motion.div
            className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center"
            {...fadeInUp}
          >
            {shouldMountIllustrations ? (
              <InteractiveArtifactsIllustration />
            ) : (
              <div className="aspect-video bg-muted/20 animate-pulse rounded-lg" />
            )}
            <div className="space-y-3 sm:space-y-4">
              <h3 className={cn(TYPOGRAPHY.HEADING.md.full, "font-bold")}>Modern Full-Stack Architecture</h3>
              <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground")}>
                Built with React 18, TypeScript, Vite, and Supabase Edge Functions. Features a sophisticated artifact system with server-side bundling, prebuilt packages, and 5-layer validation for secure code execution.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>React 18 + TypeScript + Vite</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Supabase (PostgreSQL + Edge Functions)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>70+ prebuilt npm packages (5-10x faster)</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Benefit 3: Advanced Features & Integrations */}
          <motion.div
            className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center"
            {...fadeInUp}
          >
            <div className="space-y-3 sm:space-y-4">
              <h3 className={cn(TYPOGRAPHY.HEADING.md.full, "font-bold")}>Production-Grade Features</h3>
              <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground")}>
                Enterprise-level capabilities including real-time web search via Tavily, comprehensive monitoring with Sentry, multi-CDN fallback strategy, and advanced rate limiting with analytics tracking.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Real-time web search integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Multi-provider CDN fallback</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sentry error tracking & analytics</span>
                </li>
              </ul>
            </div>
            <div className="order-first lg:order-last">
              {shouldMountIllustrations ? (
                <SecurityIllustration />
              ) : (
                <div className="aspect-video bg-muted/20 animate-pulse rounded-lg" />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
