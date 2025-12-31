import * as React from "react";
import { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { cn } from "@/lib/utils";

export interface MobileSuggestionItem {
  id: string;
  title: string;
  [key: string]: unknown;
}

export interface MobileSuggestionCarouselProps<T extends MobileSuggestionItem> {
  /** Array of suggestion items */
  items: T[];
  /** Callback when a suggestion is clicked */
  onItemClick: (item: T) => void;
  /** ID of the currently loading item */
  loadingItemId?: string | null;
  /** Auto-scroll speed (default: 0.5 - slow continuous movement) */
  speed?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MobileSuggestionCarousel - Continuous auto-scrolling carousel for mobile
 *
 * Uses Embla Carousel with AutoScroll plugin for smooth, infinite scrolling.
 * Similar to the landing page showcase carousel.
 *
 * Features:
 * - Smooth continuous scrolling (no jerky transitions)
 * - Infinite loop - seamlessly wraps around
 * - Pauses on touch/hover
 * - Minimal vertical footprint
 */
export function MobileSuggestionCarousel<T extends MobileSuggestionItem>({
  items,
  onItemClick,
  loadingItemId,
  speed = 0.5,
  className,
}: MobileSuggestionCarouselProps<T>) {
  // AutoScroll plugin configuration
  const autoScrollPlugin = useRef(
    AutoScroll({
      speed,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
      startDelay: 0,
    })
  );

  // Track resume timeout for cleanup
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "center",
      containScroll: false,
      dragFree: true,
    },
    [autoScrollPlugin.current]
  );

  // Resume auto-scroll after user interaction
  useEffect(() => {
    if (!emblaApi) return;

    const onSettle = () => {
      // Resume auto-scroll after settling
      autoScrollPlugin.current?.play();
    };

    emblaApi.on("settle", onSettle);
    return () => {
      emblaApi.off("settle", onSettle);
    };
  }, [emblaApi]);

  // Cleanup timeout on unmount and track mounted state
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const handleItemClick = useCallback(
    (item: T) => {
      // Pause auto-scroll on click
      autoScrollPlugin.current?.stop();
      onItemClick(item);

      // Clear any pending resume timeout
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }

      // Resume auto-scroll after a brief pause (2 seconds)
      // This fixes the issue where clicking without dragging would permanently stop the carousel
      resumeTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          autoScrollPlugin.current?.play();
        }
        resumeTimeoutRef.current = null;
      }, 2000);
    },
    [onItemClick]
  );

  if (items.length === 0) return null;

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-2 px-4">
          {items.map((item) => {
            const isLoading = loadingItemId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                disabled={isLoading}
                className={cn(
                  "flex-shrink-0",
                  "rounded-full px-4 py-2",
                  "bg-white/5 border border-white/10",
                  "text-sm text-white/80 whitespace-nowrap",
                  "transition-all duration-200",
                  "hover:bg-white/10 hover:border-white/20 hover:text-white",
                  "active:scale-[0.98]",
                  isLoading && "opacity-50 cursor-wait"
                )}
              >
                {item.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
