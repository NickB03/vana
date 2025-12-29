"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Sparkles, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface TourStep {
  content: React.ReactNode;
  selectorId: string;
  width?: number;
  height?: number;
  onClickWithinArea?: () => void;
  position?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  endTour: () => void;
  isActive: boolean;
  startTour: () => void;
  setSteps: (steps: TourStep[]) => void;
  steps: TourStep[];
  isTourCompleted: boolean;
  setIsTourCompleted: (completed: boolean) => void;
}

interface TourProviderProps {
  children: React.ReactNode;
  onComplete?: () => void;
  onSkip?: (completedSteps: number) => void;
  className?: string;
  isTourCompleted?: boolean;
  tourId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PADDING = 16;
const CONTENT_WIDTH = 420;
const CONTENT_HEIGHT = 220;
const TOUR_STORAGE_KEY_PREFIX = "vana-tour-";

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to detect user's reduced motion preference
 */
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// Utilities
// ============================================================================

function getElementPosition(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(
      `[Tour] Target element "${id}" not found in DOM. ` +
      `Ensure the element has id="${id}" and is rendered before starting the tour.`
    );
    return null;
  }
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

const MOBILE_BREAKPOINT = 768;

function calculateContentPosition(
  elementPos: { top: number; left: number; width: number; height: number },
  position: "top" | "bottom" | "left" | "right" = "bottom"
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

  // Calculate responsive content width
  const contentWidth = Math.min(CONTENT_WIDTH, viewportWidth - 32);

  let left = elementPos.left;
  let top = elementPos.top;

  // On mobile, prefer top/bottom positioning to avoid horizontal overflow
  const effectivePosition = isMobile && (position === "left" || position === "right")
    ? "bottom"
    : position;

  switch (effectivePosition) {
    case "top":
      top = elementPos.top - CONTENT_HEIGHT - PADDING;
      left = elementPos.left + elementPos.width / 2 - contentWidth / 2;
      break;
    case "bottom":
      top = elementPos.top + elementPos.height + PADDING;
      left = elementPos.left + elementPos.width / 2 - contentWidth / 2;
      break;
    case "left":
      left = elementPos.left - contentWidth - PADDING;
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
      break;
    case "right":
      left = elementPos.left + elementPos.width + PADDING;
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
      break;
  }

  return {
    top: Math.max(PADDING, Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING)),
    left: Math.max(PADDING, Math.min(left, viewportWidth - contentWidth - PADDING)),
    width: contentWidth,
    height: CONTENT_HEIGHT
  };
}

// ============================================================================
// Context
// ============================================================================

const TourContext = createContext<TourContextType | null>(null);


// ============================================================================
// TourProvider Component
// ============================================================================

export function TourProvider({
  children,
  onComplete,
  onSkip,
  className,
  isTourCompleted = false,
  tourId = "default",
}: TourProviderProps) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [elementPosition, setElementPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isCompleted, setIsCompleted] = useState(isTourCompleted);

  const contentRef = useRef<HTMLDivElement>(null);
  const handleClickRef = useRef<((e: MouseEvent) => void) | null>(null);
  const reducedMotion = useReducedMotion();
  const storageKey = `${TOUR_STORAGE_KEY_PREFIX}${tourId}`;

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (typeof parsed.completed === 'boolean' && parsed.completed) {
          setIsCompleted(true);
        }
      }
    } catch (error) {
      console.warn(
        `[Tour] Failed to load tour state from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [storageKey]);

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          completed: isCompleted,
          lastStep: currentStep,
        })
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Tour] localStorage quota exceeded. Tour completion state will not persist.');
      } else {
        console.warn(
          `[Tour] Failed to save tour state: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }, [isCompleted, currentStep, storageKey]);

  const updateElementPosition = useCallback(() => {
    if (currentStep >= 0 && currentStep < steps.length) {
      const position = getElementPosition(steps[currentStep]?.selectorId ?? "");
      if (position) {
        setElementPosition(position);
      }
    }
  }, [currentStep, steps]);

  useEffect(() => {
    updateElementPosition();
    window.addEventListener("resize", updateElementPosition);
    window.addEventListener("scroll", updateElementPosition);

    return () => {
      window.removeEventListener("resize", updateElementPosition);
      window.removeEventListener("scroll", updateElementPosition);
    };
  }, [updateElementPosition]);

  // Focus management - focus tooltip when step changes
  useEffect(() => {
    if (currentStep >= 0 && contentRef.current) {
      contentRef.current.focus();
    }
  }, [currentStep]);

  const nextStep = useCallback(() => {
    setDirection("next");
    setCurrentStep((prev) => {
      const isLastStep = prev >= steps.length - 1;

      if (isLastStep) {
        // Trigger completion inside the updater to use correct state
        setIsCompleted(true);
        onComplete?.();
        return -1;
      }
      return prev + 1;
    });
  }, [steps.length, onComplete]);

  const previousStep = useCallback(() => {
    setDirection("prev");
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const endTour = useCallback(() => {
    const wasSkipped = currentStep >= 0 && currentStep < steps.length - 1;
    if (wasSkipped && onSkip) {
      onSkip(currentStep + 1);
    }
    setCurrentStep(-1);
    // Mark tour as completed when user closes it (via X button or Escape)
    // This prevents the TourAlertDialog from reappearing
    setIsCompleted(true);
  }, [currentStep, steps.length, onSkip]);

  const startTour = useCallback(() => {
    if (isTourCompleted) {
      console.warn('[Tour] Attempted to start completed tour. Call setIsTourCompleted(false) first to restart.');
      return;
    }

    if (steps.length === 0) {
      console.warn(
        '[Tour] Cannot start tour: No steps defined. ' +
        'Call setSteps() with tour step configuration before starting.'
      );
      return;
    }

    setDirection("next");
    setCurrentStep(0);
  }, [isTourCompleted, steps.length]);

  // Keyboard navigation
  useEffect(() => {
    if (currentStep < 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          nextStep();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentStep > 0) previousStep();
          break;
        case "Escape":
          e.preventDefault();
          endTour();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, nextStep, previousStep, endTour]);

  // Update ref with latest click handler (avoids stale closure in event listener)
  handleClickRef.current = (e: MouseEvent) => {
    if (currentStep >= 0 && elementPosition && steps[currentStep]?.onClickWithinArea) {
      const clickX = e.clientX + window.scrollX;
      const clickY = e.clientY + window.scrollY;

      const isWithinBounds =
        clickX >= elementPosition.left &&
        clickX <= elementPosition.left + (steps[currentStep]?.width || elementPosition.width) &&
        clickY >= elementPosition.top &&
        clickY <= elementPosition.top + (steps[currentStep]?.height || elementPosition.height);

      if (isWithinBounds) {
        steps[currentStep].onClickWithinArea?.();
      }
    }
  };

  // Stable event listener that delegates to ref (prevents memory leak)
  useEffect(() => {
    const stableClickHandler = (e: MouseEvent) => {
      handleClickRef.current?.(e);
    };

    window.addEventListener("click", stableClickHandler);
    return () => {
      window.removeEventListener("click", stableClickHandler);
    };
  }, []); // Empty deps - listener is stable, ref updates

  const setIsTourCompleted = useCallback((completed: boolean) => {
    setIsCompleted(completed);
  }, []);

  // Animation variants - memoized to prevent unnecessary recreations
  const overlayAnimation = useMemo(() => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }), []);

  const spotlightAnimation = useMemo(() => (
    reducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } }
  ), [reducedMotion]);

  const contentSlideDirection = direction === "next" ? 1 : -1;
  const contentAnimation = useMemo(() => (
    reducedMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }
      : {
          initial: { opacity: 0, x: 20 * contentSlideDirection, filter: "blur(4px)" },
          animate: { opacity: 1, x: 0, filter: "blur(0px)" },
          exit: { opacity: 0, x: -20 * contentSlideDirection, filter: "blur(4px)" },
        }
  ), [reducedMotion, contentSlideDirection]);

  return (
    <TourContext.Provider
      value={{
        currentStep,
        totalSteps: steps.length,
        nextStep,
        previousStep,
        endTour,
        isActive: currentStep >= 0,
        startTour,
        setSteps,
        steps,
        isTourCompleted: isCompleted,
        setIsTourCompleted,
      }}
    >
      {children}
      <AnimatePresence>
        {currentStep >= 0 && elementPosition && (
          <>
            {/* Dark overlay with spotlight cutout */}
            <motion.div
              {...overlayAnimation}
              transition={{ duration: reducedMotion ? 0.1 : 0.3 }}
              className="fixed inset-0 z-50 overflow-hidden bg-black/70"
              style={{
                clipPath: `polygon(
                  0% 0%,
                  0% 100%,
                  100% 100%,
                  100% 0%,
                  ${elementPosition.left}px 0%,
                  ${elementPosition.left}px ${elementPosition.top}px,
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top}px,
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,
                  ${elementPosition.left}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,
                  ${elementPosition.left}px 0%
                )`,
                transition: reducedMotion ? "none" : "clip-path 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
              aria-hidden="true"
            />

            {/* Spotlight ring around target element */}
            {(() => {
              // Calculate viewport-safe dimensions to prevent ring-offset clipping
              const ringOffset = 8; // ring-offset-2 = 0.5rem = 8px
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;

              const stepWidth = steps[currentStep]?.width || elementPosition.width;
              const stepHeight = steps[currentStep]?.height || elementPosition.height;

              // Check if element touches viewport edges
              const touchesTop = elementPosition.top <= ringOffset;
              const touchesBottom = elementPosition.top + stepHeight >= viewportHeight - ringOffset;
              const touchesLeft = elementPosition.left <= ringOffset;
              const touchesRight = elementPosition.left + stepWidth >= viewportWidth - ringOffset;

              // Inset the spotlight to keep ring-offset visible within viewport
              const adjustedTop = touchesTop ? elementPosition.top + ringOffset : elementPosition.top;
              const adjustedLeft = touchesLeft ? elementPosition.left + ringOffset : elementPosition.left;
              const adjustedWidth = stepWidth
                - (touchesLeft ? ringOffset : 0)
                - (touchesRight ? ringOffset : 0);
              const adjustedHeight = stepHeight
                - (touchesTop ? ringOffset : 0)
                - (touchesBottom ? ringOffset : 0);

              return (
                <motion.div
                  {...spotlightAnimation}
                  transition={{ duration: reducedMotion ? 0.1 : 0.3 }}
                  style={{
                    position: "fixed",
                    top: adjustedTop,
                    left: adjustedLeft,
                    width: adjustedWidth,
                    height: adjustedHeight,
                  }}
                  className={cn(
                    "z-[100] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background",
                    className
                  )}
                  aria-hidden="true"
                />
              );
            })()}

            {/* Tour content tooltip */}
            <motion.div
              ref={contentRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Tour step ${currentStep + 1} of ${steps.length}`}
              tabIndex={-1}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                top: calculateContentPosition(elementPosition, steps[currentStep]?.position).top,
                left: calculateContentPosition(elementPosition, steps[currentStep]?.position).left,
              }}
              transition={{
                duration: reducedMotion ? 0.1 : 0.5,
                ease: [0.16, 1, 0.3, 1],
                opacity: { duration: reducedMotion ? 0.1 : 0.3 },
              }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
              style={{
                position: "fixed",
                width: `min(${CONTENT_WIDTH}px, calc(100vw - 32px))`,
                maxWidth: "calc(100vw - 32px)",
              }}
              className="bg-popover text-popover-foreground relative z-[100] rounded-lg border p-5 shadow-lg outline-none"
            >
              {/* Close button - top right (44x44px touch target for mobile accessibility) */}
              <button
                onClick={endTour}
                className="absolute top-1 right-1 z-10 size-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close tour"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Step counter - top left */}
              <span className="absolute top-3 left-4 text-sm text-muted-foreground tabular-nums">
                {currentStep + 1} / {steps.length}
              </span>

              {/* Step content with directional animation */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`tour-content-${currentStep}`}
                  {...contentAnimation}
                  transition={{ duration: reducedMotion ? 0.1 : 0.25 }}
                  className="overflow-hidden pt-4"
                >
                  {steps[currentStep]?.content}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div
                className="mt-4 flex items-center justify-between"
                role="navigation"
                aria-label="Tour navigation"
              >
                {/* Previous button - left (44px height for mobile touch targets) */}
                {currentStep > 0 ? (
                  <Button
                    onClick={previousStep}
                    variant="ghost"
                    className="h-11 px-4"
                    aria-label={`Go to previous step (${currentStep} of ${steps.length})`}
                  >
                    Previous
                  </Button>
                ) : (
                  <div />
                )}

                {/* Next button - right (44px height for mobile touch targets) */}
                <Button
                  onClick={nextStep}
                  className="h-11 px-4"
                  aria-label={
                    currentStep === steps.length - 1
                      ? "Finish tour"
                      : `Go to next step (${currentStep + 2} of ${steps.length})`
                  }
                >
                  {currentStep === steps.length - 1 ? "Finish" : "Next"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  );
}

// ============================================================================
// useTour Hook
// ============================================================================

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}

// ============================================================================
// TourAlertDialog Component
// ============================================================================

export function TourAlertDialog({
  isOpen,
  setIsOpen
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { startTour, steps, isTourCompleted, currentStep } = useTour();
  const reducedMotion = useReducedMotion();

  if (isTourCompleted || steps.length === 0 || currentStep > -1) {
    return null;
  }

  const handleSkip = () => {
    setIsOpen(false);
  };

  const iconAnimation = reducedMotion
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
      }
    : {
        initial: { scale: 0.5, rotate: -180, opacity: 0 },
        animate: {
          scale: 1,
          rotate: 0,
          opacity: 1,
          y: [0, -12, 0],
        },
      };

  const iconTransition = reducedMotion
    ? { duration: 0.2 }
    : {
        scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
        rotate: { duration: 0.5, ease: "easeOut" },
        opacity: { duration: 0.3 },
        y: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        },
      };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md w-[calc(100vw-32px)] sm:w-full p-4 sm:p-6 mx-4 sm:mx-auto">
        <AlertDialogHeader className="flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <motion.div {...iconAnimation} transition={iconTransition}>
              <div className="relative">
                <Sparkles className="size-24 stroke-1 text-primary" />
                {/* Subtle pulse ring - only if motion not reduced */}
                {!reducedMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 0, 0.4],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>
            </motion.div>
          </div>
          <AlertDialogTitle className="text-center text-xl font-medium">
            Welcome to Vana
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground mt-2 text-center text-sm">
            Take a quick tour to learn about the key features and functionality of this application.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-6 space-y-3">
          <Button onClick={startTour} className="w-full h-11">
            Start Tour
          </Button>
          <Button onClick={handleSkip} variant="ghost" className="w-full h-11">
            Skip Tour
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
