import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoPreview } from "./DemoPreview";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/utils/animationConstants";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";
import VanaTextAnimation from "./VanaTextAnimation";

export const Hero = () => {
  const scrollToApp = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth"
    });
  };

  return (
    <section className={combineSpacing("relative min-h-[100dvh] w-full flex items-center justify-center", SECTION_SPACING.full)}>
      <div className="container max-w-7xl mx-auto relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center w-full">
          {/* Left: Headline + CTAs */}
          <motion.div
            className="space-y-4 sm:space-y-6 text-center lg:text-left will-change-transform transform-gpu"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 4px 16px rgba(0, 0, 0, 0.6)'
            }}
          >
            <motion.div variants={staggerItem}>
              <Badge variant="secondary" className="text-sm">
                Designed and built by Nick Bohmer
              </Badge>
            </motion.div>
            <motion.div variants={staggerItem}>
              <VanaTextAnimation
                prefix="Hi, I'm "
                highlight="Vana"
                initialDelay={200}
                staggerDelay={60}
              />
            </motion.div>
            <motion.p
              className={cn(TYPOGRAPHY.BODY.lg.full, "text-white/90 max-w-2xl")}
              variants={staggerItem}
            >
              Real-time AI that generates interactive code, images, diagrams, and
              deep research—all in one seamless interface.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
              variants={staggerItem}
            >
              <Button
                size="lg"
                className="bg-white hover:bg-gray-100 text-black transition-all hover:scale-105 active:scale-95"
                onClick={scrollToApp}
              >
                Get Started Free
              </Button>
            </motion.div>
            <motion.div
              className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center lg:justify-start text-xs sm:text-sm text-gray-200 pt-2 sm:pt-4"
              variants={staggerItem}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" aria-hidden="true" />
                <span>Cloud based</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" aria-hidden="true" />
                <span>No sign-in required</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Animated Preview */}
          <div className="order-first lg:order-last">
            <DemoPreview />
          </div>
        </div>
      </div>
    </section>
  );
};
