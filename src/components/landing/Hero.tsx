import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { DemoPreview } from "./DemoPreview";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/utils/animationConstants";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";

export const Hero = () => {
  const scrollToDemo = () => {
    const featuresSection = document.getElementById("features");
    featuresSection?.scrollIntoView({ behavior: "smooth" });
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
            <motion.h1
              className={cn(TYPOGRAPHY.DISPLAY.xl.full, "font-bold text-white")}
              variants={staggerItem}
            >
              Chat with AI, Build Anything
            </motion.h1>
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
              <Button size="lg" className="bg-white hover:bg-gray-100 text-black" asChild>
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-gray-800" onClick={scrollToDemo}>
                Watch Demo
              </Button>
            </motion.div>
            <motion.div
              className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-400 pt-4"
              variants={staggerItem}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
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
