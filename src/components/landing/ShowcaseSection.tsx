import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, Image, BarChart3, Code2, FileText, GitBranch } from "lucide-react";
import { motion } from "motion/react";
import { hoverLift } from "@/utils/animationConstants";
import { toast } from "sonner";

interface ShowcaseItem {
  id: string;
  title: string;
  icon: React.ElementType;
  gradient: string;
  content: React.ReactNode;
}

const showcaseItems: ShowcaseItem[] = [
  {
    id: "research",
    title: "Research Assistant",
    icon: Sparkles,
    gradient: "from-blue-500 via-cyan-500 to-blue-600",
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-6 h-full flex flex-col relative overflow-hidden border border-border/50">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-ring/10 pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground mb-2">How does quantum computing work?</div>
              <div className="text-foreground/80 space-y-2 text-sm leading-relaxed">
                <p>Quantum computing leverages quantum mechanical phenomena like superposition and entanglement...</p>
                <div className="mt-3 bg-muted/30 border border-primary/20 rounded-lg p-3">
                  <p className="font-medium text-primary text-xs mb-2">Key Concepts:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-ring mt-0.5">•</span>
                      <span>Qubits can exist in multiple states simultaneously</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-ring mt-0.5">•</span>
                      <span>Quantum entanglement enables complex calculations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-ring mt-0.5">•</span>
                      <span>Exponential speedup for specific problem types</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground">Sources: 12 research papers analyzed</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "code",
    title: "Coding Assistant",
    icon: Code2,
    gradient: "from-blue-500 via-cyan-500 to-blue-600",
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-6 h-full font-mono relative overflow-hidden border border-border/50">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-ring/10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
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
    id: "visualization",
    title: "Data Visualization",
    icon: BarChart3,
    gradient: "from-green-500 via-emerald-500 to-green-600",
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-6 h-full relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-green-400" />
            <h4 className="font-semibold text-foreground">Q4 2024 Performance</h4>
          </div>
          <div className="space-y-3 flex-1">
            <div className="bg-muted/50 border border-green-500/20 rounded-lg p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Revenue Growth</span>
                <span className="font-semibold text-green-400">+34%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div className="bg-muted/50 border border-blue-500/20 rounded-lg p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">User Engagement</span>
                <span className="font-semibold text-blue-400">+56%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[92%] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                <div className="text-xl font-bold text-green-400">12K</div>
                <div className="text-[10px] text-muted-foreground">New Users</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                <div className="text-xl font-bold text-blue-400">98%</div>
                <div className="text-[10px] text-muted-foreground">Uptime</div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2">
                <div className="text-xl font-bold text-cyan-400">4.8</div>
                <div className="text-[10px] text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "diagrams",
    title: "Mermaid Diagrams",
    icon: GitBranch,
    gradient: "from-blue-500 via-cyan-500 to-blue-600",
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-6 h-full flex flex-col relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-5 w-5 text-blue-400" />
            <h4 className="font-semibold text-foreground">User Authentication Flow</h4>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-3 w-full">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-10 bg-blue-500/20 border border-blue-500/40 rounded-lg flex items-center justify-center text-sm font-medium text-blue-300">
                  User Login
                </div>
                <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                <div className="flex-1 h-10 bg-cyan-500/20 border border-cyan-500/40 rounded-lg flex items-center justify-center text-sm font-medium text-cyan-300">
                  Validate
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-500 to-green-500"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-10 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center justify-center text-sm font-medium text-red-300">
                  Error
                </div>
                <div className="w-8"></div>
                <div className="flex-1 h-10 bg-green-500/20 border border-green-500/40 rounded-lg flex items-center justify-center text-sm font-medium text-green-300">
                  Success
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground">Interactive flowchart • Auto-generated from description</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "image",
    title: "Image Generation",
    icon: Image,
    gradient: "from-orange-500 via-red-500 to-orange-600",
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-6 h-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 pointer-events-none"></div>

        <div className="relative z-10 w-full flex flex-col items-center justify-center h-full">
          <div className="w-full aspect-square bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-xl flex items-center justify-center relative overflow-hidden max-h-48 border-2 border-orange-500/20">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
            <div className="relative text-center p-6">
              <Image className="h-16 w-16 text-foreground/90 mx-auto mb-3" />
              <p className="text-foreground text-sm font-semibold">AI-Generated Artwork</p>
              <p className="text-foreground/70 text-xs mt-1">Abstract digital landscape</p>
            </div>
          </div>
          <div className="mt-4 text-center bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">Generated in <span className="text-orange-400 font-semibold">2.3 seconds</span></p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "documents",
    title: "Document Creation",
    icon: FileText,
    gradient: "from-yellow-500 via-orange-500 to-yellow-600",
    content: (
      <div className="bg-gradient-to-br from-card via-muted/50 to-card rounded-lg p-6 h-full relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-yellow-400" />
            <h4 className="font-semibold text-foreground">Product Requirements Document</h4>
          </div>
          <div className="flex-1 bg-muted/50 border border-yellow-500/20 rounded-lg p-4 space-y-3 text-sm overflow-y-auto overflow-x-hidden">
            <div>
              <h5 className="font-semibold text-xs mb-1 text-yellow-400">1. Overview</h5>
              <p className="text-foreground/80 text-xs leading-relaxed">
                This document outlines the requirements for implementing a new user dashboard feature with analytics and customization.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-xs mb-1 text-yellow-400">2. User Stories</h5>
              <ul className="text-foreground/80 text-xs space-y-1 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>As a user, I want to view my activity metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>As a user, I want to customize my dashboard layout</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>As an admin, I want to track user engagement</span>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-xs mb-2 text-yellow-400">3. Technical Requirements</h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                  <div className="font-semibold text-[10px] text-yellow-300">Framework</div>
                  <div className="text-muted-foreground text-[10px]">React 18+</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                  <div className="font-semibold text-[10px] text-yellow-300">Database</div>
                  <div className="text-muted-foreground text-[10px]">PostgreSQL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export const ShowcaseSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      containScroll: "trimSnaps",
    },
    [
      AutoScroll({
        speed: 1,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        startDelay: 0,
      })
    ]
  );

  const scrollPrev = useCallback(() => {
    if (!emblaApi) {
      toast.error('Carousel not ready yet. Please wait a moment.', {
        id: 'carousel-not-ready'
      });
      console.warn('Carousel not initialized yet');
      return;
    }
    try {
      emblaApi.scrollPrev();
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
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) {
      toast.error('Carousel not ready yet. Please wait a moment.', {
        id: 'carousel-not-ready'
      });
      console.warn('Carousel not initialized yet');
      return;
    }
    try {
      emblaApi.scrollNext();
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
  }, [emblaApi]);

  return (
    <section id="showcase" className="py-24 px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            See What's Possible with Vana
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
            className="overflow-hidden pb-4"
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
                    className="flex-[0_0_380px] min-w-0"
                  >
                    <motion.div
                      {...hoverLift}
                    >
                      <Card className="overflow-hidden h-full group hover:shadow-2xl transition-all duration-300 bg-card border-0 relative">
                        {/* Gradient glow border effect */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-lg opacity-50 blur-xl group-hover:opacity-75 transition-opacity`}></div>
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
            <Button variant="outline" size="sm" onClick={scrollPrev} disabled={!emblaApi} aria-label="Previous showcase item">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={scrollNext} disabled={!emblaApi} aria-label="Next showcase item">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
