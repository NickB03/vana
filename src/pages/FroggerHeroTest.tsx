import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/utils/animationConstants";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";
import VanaTextAnimation from "@/components/landing/VanaTextAnimation";
import { FroggerDemoVideo } from "@/components/demo/FroggerDemoVideo";
import { GradientBackground } from "@/components/ui/bg-gredient";

/**
 * FroggerHeroTest - Test page to preview Frogger demo video as landing page hero
 *
 * Shows how the Frogger demo video would look when integrated
 * into the landing page hero section, replacing the static demo preview.
 * This uses the screen recording of the whole demo (not just the frogger portion).
 *
 * Route: /frogger-hero-test
 */
const FroggerHeroTest = () => {
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth"
    });
  };

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden">
      {/* Global Gradient Background */}
      <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
        <GradientBackground
          gradientFrom="#000000"
          gradientTo="#1e293b"
          gradientPosition="50% 20%"
          gradientSize="150% 150%"
          gradientStop="30%"
        />
      </div>

      <section className={combineSpacing("relative min-h-[100dvh] w-full flex items-center justify-center", SECTION_SPACING.full)}>
        <div className="container max-w-[100rem] mx-auto relative z-10 w-full px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-[1.3fr,1.5fr] lg:grid-cols-[1.5fr,1.8fr] gap-8 sm:gap-10 lg:gap-10 items-center w-full">
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
                A powerful AI platform able to generate code, websites, games, dashboards, perform deep research, generate images and much more.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
                variants={staggerItem}
              >
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-100 text-black transition-all hover:scale-105 active:scale-95"
                  onClick={scrollToBottom}
                >
                  Explore
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

            {/* Right: Interactive Frogger Game in Browser Chrome */}
            <div className="order-first lg:order-last">
              <motion.div
                className="relative w-full aspect-[892/720]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {/* Browser chrome container */}
                <div className="relative w-full h-full bg-black/50 border border-border/50 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                  {/* Browser chrome header */}
                  <div className="bg-black/50 border-b border-border/50 px-4 py-2 flex items-center gap-2 shrink-0">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 bg-black/50 rounded px-3 py-1 text-xs text-muted-foreground ml-2">
                      vana.bot/demos/frogger-demo
                    </div>
                  </div>

                  {/* Video content - fills remaining space */}
                  <div className="flex-1 overflow-hidden bg-neutral-900">
                    <FroggerDemoVideo autoPlay={true} loop={true} />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Placeholder content to enable scrolling */}
      <div className="h-screen flex items-center justify-center">
        <div className="text-white/60 text-center">
          <p className="text-xl mb-4">This is a test page</p>
          <p className="text-sm">Scroll back up to see the hero section</p>
        </div>
      </div>
    </main>
  );
};

export default FroggerHeroTest;
