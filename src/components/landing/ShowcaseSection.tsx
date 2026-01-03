import { useCallback, useRef, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Image, BarChart3, Code2, FileText, GitBranch, Gamepad2 } from "lucide-react";
import { motion } from "motion/react";
import { hoverLift, fadeInUp } from "@/utils/animationConstants";
import { SECTION_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CARD_STATES } from "@/utils/interactionConstants";
import { GRADIENTS, SHOWCASE_GRADIENTS } from "@/utils/colorConstants";
import { FroggerGame } from "@/components/demo/FroggerGame";

interface ShowcaseItem {
  id: string;
  title: string;
  icon: React.ElementType;
  gradient: string;
  content: React.ReactNode;
}

const showcaseItems: ShowcaseItem[] = [
  {
    id: "frogger",
    title: "Interactive Game",
    icon: Gamepad2,
    gradient: SHOWCASE_GRADIENTS.code,
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-3 sm:p-4 h-full flex flex-col relative overflow-hidden border border-border/50">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground-accessible">Created with "Build me a Frogger game"</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
            <div className="scale-[0.85] origin-center">
              <FroggerGame />
            </div>
          </div>
          <div className="mt-2 text-center">
            <div className="text-xs text-muted-foreground-accessible">Fully playable • Generated in seconds</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "image-pikachu",
    title: "Image Generation",
    icon: Image,
    gradient: SHOWCASE_GRADIENTS.image,
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-4 sm:p-6 h-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

        <div className="relative z-10 w-full flex flex-col items-center justify-center h-full">
          <div className="w-full aspect-square bg-gradient-to-br from-yellow-500/80 to-orange-500/60 rounded-xl flex items-center justify-center relative overflow-hidden max-h-48 border-2 border-yellow-500/20">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
            <div className="relative text-center p-6">
              <Sparkles className="h-16 w-16 text-foreground/90 mx-auto mb-3" />
              <p className="text-foreground text-sm font-semibold">Pikachu Surfing</p>
              <p className="text-foreground/70 text-xs mt-1">"Pikachu on a surfboard wearing a tuxedo"</p>
            </div>
          </div>
          <div className="mt-4 text-center bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground-accessible">Generated in <span className="text-primary font-semibold">2.3 seconds</span></p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "code",
    title: "Coding Assistant",
    icon: Code2,
    gradient: SHOWCASE_GRADIENTS.code,
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-4 sm:p-6 h-full font-mono relative overflow-hidden border border-border/50">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground-accessible">
            <Code2 className="h-4 w-4 text-primary" />
            <span className="text-xs">debounce.ts</span>
            <div className="ml-auto px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-[10px] text-primary">
              TypeScript
            </div>
          </div>
          <div className="flex-1 bg-muted/50 border border-primary/20 rounded-lg p-3 overflow-hidden">
            <pre className="text-foreground/80 text-[10px] leading-relaxed overflow-x-auto whitespace-pre">
{`function debounce<T>(
  func: T,
  wait: number
): (...args) => void {
  let timeout;

  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(
      () => func(...args),
      wait
    );
  };
}

// Usage example
const search = debounce(
  (q) => console.log(q),
  300
);`}
            </pre>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-[10px] text-green-300">
              ✓ Type-safe
            </div>
            <div className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-300">
              Generic
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "image-landscape",
    title: "Image Generation",
    icon: Image,
    gradient: SHOWCASE_GRADIENTS.image,
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-4 sm:p-6 h-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

        <div className="relative z-10 w-full flex flex-col items-center justify-center h-full">
          <div className="w-full aspect-square bg-gradient-to-br from-blue-500/80 to-purple-500/60 rounded-xl flex items-center justify-center relative overflow-hidden max-h-48 border-2 border-blue-500/20">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
            <div className="relative text-center p-6">
              <Image className="h-16 w-16 text-foreground/90 mx-auto mb-3" />
              <p className="text-foreground text-sm font-semibold">Futuristic Cityscape</p>
              <p className="text-foreground/70 text-xs mt-1">"Neon cyberpunk city at night"</p>
            </div>
          </div>
          <div className="mt-4 text-center bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground-accessible">Generated in <span className="text-primary font-semibold">1.8 seconds</span></p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "visualization",
    title: "Data Visualization",
    icon: BarChart3,
    gradient: SHOWCASE_GRADIENTS.visualization,
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-4 sm:p-6 h-full relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-green-400" />
            <h4 className="font-semibold text-foreground">Q4 2024 Performance</h4>
          </div>
          <div className="space-y-3 flex-1">
            <div className="bg-muted/50 border border-green-500/20 rounded-lg p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground-accessible">Revenue Growth</span>
                <span className="font-semibold text-green-400">+34%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div className="bg-muted/50 border border-blue-500/20 rounded-lg p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground-accessible">User Engagement</span>
                <span className="font-semibold text-blue-400">+56%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[92%] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                <div className="text-xl font-bold text-purple-400">12K</div>
                <div className="text-[10px] text-muted-foreground-accessible">New Users</div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2">
                <div className="text-xl font-bold text-cyan-400">98%</div>
                <div className="text-[10px] text-muted-foreground-accessible">Uptime</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                <div className="text-xl font-bold text-orange-400">4.8</div>
                <div className="text-[10px] text-muted-foreground-accessible">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "image-portrait",
    title: "Image Generation",
    icon: Image,
    gradient: SHOWCASE_GRADIENTS.image,
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-4 sm:p-6 h-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>

        <div className="relative z-10 w-full flex flex-col items-center justify-center h-full">
          <div className="w-full aspect-square bg-gradient-to-br from-pink-500/80 to-rose-500/60 rounded-xl flex items-center justify-center relative overflow-hidden max-h-48 border-2 border-pink-500/20">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
            <div className="relative text-center p-6">
              <Sparkles className="h-16 w-16 text-foreground/90 mx-auto mb-3" />
              <p className="text-foreground text-sm font-semibold">Abstract Portrait</p>
              <p className="text-foreground/70 text-xs mt-1">"Watercolor portrait, ethereal"</p>
            </div>
          </div>
          <div className="mt-4 text-center bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground-accessible">Generated in <span className="text-primary font-semibold">2.1 seconds</span></p>
          </div>
        </div>
      </div>
    ),
  },
];

export const ShowcaseSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer to detect when carousel is in viewport
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.3 } // Trigger when 30% visible
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const autoScrollPlugin = useRef(
    AutoScroll({
      speed: 1,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      startDelay: 0,
    })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      containScroll: "trimSnaps",
    },
    [autoScrollPlugin.current]
  );

  // Track carousel ready state to prevent error toasts on early clicks
  const [isCarouselReady, setIsCarouselReady] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    // Wait for embla to be fully initialized
    const timer = setTimeout(() => setIsCarouselReady(true), 100);
    return () => clearTimeout(timer);
  }, [emblaApi]);

  // Control auto-scroll based on viewport visibility
  useEffect(() => {
    if (!emblaApi || !autoScrollPlugin.current) return;

    if (isInView) {
      autoScrollPlugin.current.play();
    } else {
      autoScrollPlugin.current.stop();
    }
  }, [isInView, emblaApi]);

  // Track last manual interaction time for pause-on-interaction
  const lastInteractionTime = useRef<number>(0);
  const AUTO_SCROLL_PAUSE_DURATION = 10000; // 10 seconds

  // Resume auto-scroll after pause duration
  useEffect(() => {
    if (!emblaApi || !isInView) return;

    const checkAutoScroll = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionTime.current;
      if (timeSinceInteraction > AUTO_SCROLL_PAUSE_DURATION) {
        autoScrollPlugin.current?.play();
      }
    }, 1000);

    return () => clearInterval(checkAutoScroll);
  }, [emblaApi, isInView]);

  const scrollPrev = useCallback(() => {
    if (!emblaApi || !isCarouselReady) {
      // Silently ignore if carousel isn't ready yet (prevents error toasts)
      return;
    }
    try {
      emblaApi.scrollPrev();
      // Pause auto-scroll on manual interaction
      lastInteractionTime.current = Date.now();
      autoScrollPlugin.current?.stop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Carousel navigation error:', errorMessage);
      toast.error('Unable to navigate carousel. Try refreshing the page.', {
        id: 'carousel-nav-error'
      });
      // Attempt recovery by reinitializing
      try {
        emblaApi.reInit();
      } catch (reinitError) {
        console.error('Carousel reinit failed:', reinitError);
      }
    }
  }, [emblaApi, isCarouselReady]);

  const scrollNext = useCallback(() => {
    if (!emblaApi || !isCarouselReady) {
      // Silently ignore if carousel isn't ready yet (prevents error toasts)
      return;
    }
    try {
      emblaApi.scrollNext();
      // Pause auto-scroll on manual interaction
      lastInteractionTime.current = Date.now();
      autoScrollPlugin.current?.stop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Carousel navigation error:', errorMessage);
      toast.error('Unable to navigate carousel. Try refreshing the page.', {
        id: 'carousel-nav-error'
      });
      // Attempt recovery by reinitializing
      try {
        emblaApi.reInit();
      } catch (reinitError) {
        console.error('Carousel reinit failed:', reinitError);
      }
    }
  }, [emblaApi, isCarouselReady]);

  return (
    <section ref={sectionRef} id="showcase" className={combineSpacing("relative w-full", SECTION_SPACING.full)}>
      <motion.div
        className="container max-w-7xl mx-auto w-full relative z-10"
        {...fadeInUp}
      >
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-12 lg:mb-16">
          <h2 className={cn(TYPOGRAPHY.HEADING.lg.full, "font-bold")}>
            See What's Possible with Vana
          </h2>
          <p className={cn(TYPOGRAPHY.BODY.lg.full, "text-muted-foreground-accessible max-w-2xl mx-auto px-4 sm:px-0")}>
            Real examples of AI-powered creation—from research to code, visuals to documentation.
          </p>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 rounded-full shadow-lg hidden md:flex"
            onClick={scrollPrev}
            disabled={!emblaApi}
            aria-label="Previous showcase item"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 rounded-full shadow-lg hidden md:flex"
            onClick={scrollNext}
            disabled={!emblaApi}
            aria-label="Next showcase item"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Embla Carousel Container with Mask Fade */}
          <div
            className="overflow-hidden py-4"
            ref={emblaRef}
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)'
            }}
          >
            <div className="flex gap-6" style={{ touchAction: 'pan-y pinch-zoom' }}>
              {showcaseItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex-[0_0_100%] sm:flex-[0_0_340px] tablet:flex-[0_0_360px] md:flex-[0_0_380px] min-w-0"
                  >
                    <motion.div
                      className="will-change-transform transform-gpu"
                      {...hoverLift}
                      tabIndex={0}
                      role="article"
                      aria-label={item.title}
                    >
                      <Card className={cn("overflow-hidden h-full group hover:shadow-2xl transition-all duration-300 bg-card border-0 relative", "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none")}>
                        {/* Gradient glow border effect */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-lg opacity-60 blur-xl group-hover:opacity-85 transition-opacity`}></div>
                        <div className="absolute inset-[2px] bg-card rounded-lg"></div>

                        {/* Content */}
                        <div className="relative z-10 h-[420px] flex flex-col overflow-hidden">
                          {/* Title overlay at top */}
                          <div className="p-4 pb-0">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                              <h3 className="font-bold text-foreground">{item.title}</h3>
                            </div>
                          </div>

                          {/* Full content area */}
                          <div className="flex-1 p-4 pt-3 overflow-hidden">
                            {item.content}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Navigation Hint */}
          <div className="flex md:hidden justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollPrev}
              disabled={!emblaApi || !isCarouselReady}
              className={!isCarouselReady ? 'opacity-50 cursor-not-allowed' : ''}
              aria-label="Previous showcase item"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollNext}
              disabled={!emblaApi || !isCarouselReady}
              className={!isCarouselReady ? 'opacity-50 cursor-not-allowed' : ''}
              aria-label="Next showcase item"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
