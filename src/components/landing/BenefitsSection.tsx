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
            An AI-powered development assistant that transforms natural language into interactive code, components, and diagrams in real-time.
          </p>
        </motion.div>

        <div className="space-y-12 sm:space-y-16 lg:space-y-20">
          {/* Benefit 1: Real-time Generation */}
          <motion.div
            className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center"
            {...fadeInUp}
          >
            <div className="space-y-3 sm:space-y-4">
              <h3 className={cn(TYPOGRAPHY.HEADING.md.full, "font-bold")}>From idea to code in seconds</h3>
              <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground")}>
                Vana generates production-ready code as you type. Watch your ideas materialize with streaming responses that render instantly in an interactive preview canvas.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Real-time streaming code generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Instant artifact rendering</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Live preview updates</span>
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

          {/* Benefit 2: Interactive Artifacts */}
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
              <h3 className={cn(TYPOGRAPHY.HEADING.md.full, "font-bold")}>More than just chat</h3>
              <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground")}>
                Every conversation can generate interactive artifacts—fully functional React components, validated HTML pages, Mermaid diagrams, and SVG graphics—all rendered in a sandboxed environment alongside your chat.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Radix UI component support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>External library integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Code validation & error detection</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Benefit 3: Secure & Private */}
          <motion.div
            className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center"
            {...fadeInUp}
          >
            <div className="space-y-3 sm:space-y-4">
              <h3 className={cn(TYPOGRAPHY.HEADING.md.full, "font-bold")}>Built with security in mind</h3>
              <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground")}>
                Vana is built on Supabase with authentication, Row-Level Security policies, and sandboxed execution. Your conversations and artifacts remain private and secure.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Supabase Auth with RLS</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sandboxed iframe execution</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Input validation & sanitization</span>
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
