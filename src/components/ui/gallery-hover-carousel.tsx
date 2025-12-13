import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface GalleryHoverCarouselItem {
  id: string;
  title: string;
  summary: string;
  url?: string;
  image: string;
  prompt?: string;
}

export default function GalleryHoverCarousel({
  heading = "Featured Projects",
  demoUrl = "#",
  onItemClick,
  loadingItemId,
  className,
  items = [
    {
      id: "item-1",
      title: "Build Modern UIs",
      summary:
        "Create stunning user interfaces with our comprehensive design system.",
      url: "#",
      image:
        "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-02.png",
    },
    {
      id: "item-2",
      title: "Computer Vision Technology",
      summary:
        "Powerful image recognition and processing capabilities that allow AI systems to analyze, understand, and interpret visual information from the world.",
      url: "#",
      image:
        "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-gradient.png",
    },
    {
      id: "item-3",
      title: "Machine Learning Automation",
      summary:
        "Self-improving algorithms that learn from data patterns to automate complex tasks and make intelligent decisions with minimal human intervention.",
      url: "#",
      image:
        "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/featured-01.png",
    },
    {
      id: "item-4",
      title: "Predictive Analytics",
      summary:
        "Advanced forecasting capabilities that analyze historical data to predict future trends and outcomes, helping businesses make data-driven decisions.",
      url: "#",
      image:
        "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/featured-06.png",
    },
    {
      id: "item-5",
      title: "Neural Network Architecture",
      summary:
        "Sophisticated AI models inspired by human brain structure, capable of solving complex problems through deep learning and pattern recognition.",
      url: "#",
      image:
        "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/Screenshot%202025-08-05%20at%2021-15-55%20Ruixen%20-%20Beautifully%20crafted%20UI%20components%20to%20elevate%20your%20web%20projects.png",
    }
  ],
}: {
  heading?: string;
  demoUrl?: string;
  onItemClick?: (item: GalleryHoverCarouselItem) => void;
  loadingItemId?: string | null;
  className?: string;
  items?: GalleryHoverCarouselItem[];
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;

    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    updateScrollState();
    carouselApi.on("select", updateScrollState);
    carouselApi.on("reInit", updateScrollState);

    return () => {
      carouselApi.off("select", updateScrollState);
    };
  }, [carouselApi]);

  const handlePrev = () => {
    carouselApi?.scrollPrev();
  };

  const handleNext = () => {
    carouselApi?.scrollNext();
  };

  return (
    <section className={className || "py-32 bg-background"}>
      <div className="container mx-auto px-4 sm:px-6">
        {heading && (
          <div className="mb-6 sm:mb-8 flex flex-col justify-between md:mb-14 md:flex-row md:items-end lg:mb-16">
            <div className="max-w-2xl">
              <h3 className="text-base sm:text-lg md:text-xl lg:text-3xl font-medium text-gray-900 dark:text-white leading-relaxed">
              {heading}{" "}
              <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm md:text-base lg:text-3xl"> Explore our collection of innovative solutions and cutting-edge technologies designed to transform your business.</span>
            </h3>
            </div>
          </div>
        )}

        <div className="w-full max-w-full relative group/carousel">
          {/* Navigation Buttons - visible on hover */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none z-10 px-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full pointer-events-auto bg-background/30 backdrop-blur-sm hover:bg-background/50 border-white/30 hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full pointer-events-auto bg-background/30 backdrop-blur-sm hover:bg-background/50 border-white/30 hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
          <Carousel
            setApi={setCarouselApi}
            opts={{
              loop: true,
              align: "start",
            }}
            className="relative w-full max-w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4 -mr-2 md:-mr-4 py-3 sm:py-4">
              {items.map((item) => {
                const isLoading = loadingItemId === item.id;
                return (
                <CarouselItem key={item.id} className="px-2 sm:px-3 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6">
                  <div
                    onClick={() => !isLoading && onItemClick?.(item)}
                    className={`group block relative w-full h-[100px] sm:h-[110px] md:h-[120px] ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    <Card className={`overflow-hidden rounded-3xl h-full w-full transition-all duration-300 hover:scale-105 ${isLoading ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                      {/* Image */}
                      <div className="relative h-full w-full transition-all duration-500 h-1/2">
                        <img
                          src={item.image}
                          alt={item.title}
                          className={`h-full w-full object-cover object-center transition-all ${isLoading ? 'blur-sm opacity-70' : ''}`}
                          loading="lazy"
                          decoding="async"
                          width={400}
                          height={300}
                          style={{ aspectRatio: '4/3' }}
                        />
                        {/* Loading overlay */}
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                              <span className="text-xs text-white font-medium">Creating...</span>
                            </div>
                          </div>
                        )}
                        {/* Fade overlay at bottom */}
                        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/60 to-transparent opacity-100 transition-opacity duration-500" />
                      </div>

                      {/* Text Section */}
                      <div className="absolute bottom-0 left-0 w-full h-1/2 px-2 sm:px-3 transition-all duration-500 flex flex-col justify-center bg-background/95 backdrop-blur-sm opacity-100 rounded-b-3xl">
                        <h3 className="text-xs font-medium sm:text-sm">{item.title}</h3>
                        <p className="text-muted-foreground text-[10px] sm:text-xs line-clamp-2">
                          {item.summary}
                        </p>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 border border-gray-200 dark:border-gray-800 hover:-rotate-45 transition-all duration-500 rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-primary hover:text-primary/80"
                        >
                          <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    </Card>
                  </div>
                </CarouselItem>
              )
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
