import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { DemoPreview } from "./DemoPreview";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/utils/animationConstants";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";
import VanaTextAnimation from "./VanaTextAnimation";

export const Hero = () => {
  const scrollToDemo = () => {
    const showcaseSection = document.getElementById("showcase");
    showcaseSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className={combineSpacing("relative min-h-[100dvh] w-full flex items-center justify-center", SECTION_SPACING.full)}>
      <div className="container max-w-7xl mx-auto relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left: Headline + CTAs */}
          <motion.div
            className="space-y-6 text-center lg:text-left will-change-transform transform-gpu"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
              <Badge variant="secondary" className="text-sm">
                Powered by Claude AI
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
              className={cn(TYPOGRAPHY.BODY.lg.full, "text-gray-300 max-w-2xl")}
              variants={staggerItem}
            >
              Real-time AI conversations that generate interactive code, React
              components, diagrams, and more—all in one seamless interface.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              variants={staggerItem}
            >
              <Button
                size="lg"
                className="bg-white hover:bg-gray-100 text-black transition-all hover:scale-105 active:scale-95"
                asChild
              >
                <Link to="/">Get Started Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800 hover:border-gray-600 transition-all hover:scale-105 active:scale-95"
                onClick={scrollToDemo}
              >
                Watch Demo
              </Button>
            </motion.div>
            <motion.div
              className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-400 pt-4"
              variants={staggerItem}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                <span>Free to start</span>
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
