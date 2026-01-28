"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logError, logForDebugging } from "@/utils/errorLogging";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  X,
  Github,
  Linkedin,
} from 'lucide-react';

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

function getElementPosition(id: string, stepIndex?: number, tourId?: string) {
  const element = document.getElementById(id);
  if (!element) {
    logForDebugging(
      `[Tour] Target element "${id}" not found in DOM. ` +
      `Ensure the element has id="${id}" and is rendered before starting the tour.`
    );
    logError(
      `Tour target element not found: ${id}`,
      {
        errorId: 'TOUR_ELEMENT_NOT_FOUND',
        metadata: {
          selectorId: id,
          stepIndex,
          tourId,
          availableIds: Array.from(document.querySelectorAll('[id]'))
            .map(el => el.id)
            .slice(0, 20), // First 20 IDs for debugging
        }
      }
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

function calculateContentPosition(
  elementPos: { top: number; left: number; width: number; height: number },
  position: "top" | "bottom" | "left" | "right" = "bottom"
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 768;

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
      logError(
        error instanceof Error ? error : new Error('Failed to load tour state'),
        {
          errorId: 'TOUR_LOCALSTORAGE_READ_FAILED',
          metadata: {
            storageKey,
            errorType: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
          }
        }
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
        logError(
          'localStorage quota exceeded - tour state will not persist',
          {
            errorId: 'TOUR_LOCALSTORAGE_QUOTA_EXCEEDED',
            metadata: { storageKey, isCompleted, currentStep }
          }
        );
      } else {
        logError(
          error instanceof Error ? error : new Error('Failed to save tour state'),
          {
            errorId: 'TOUR_LOCALSTORAGE_WRITE_FAILED',
            metadata: {
              storageKey,
              errorType: error instanceof Error ? error.name : 'Unknown',
              errorMessage: error instanceof Error ? error.message : String(error),
            }
          }
        );
      }
    }
  }, [isCompleted, currentStep, storageKey]);

  const updateElementPosition = useCallback(() => {
    if (currentStep >= 0 && currentStep < steps.length) {
      const position = getElementPosition(
        steps[currentStep]?.selectorId ?? "",
        currentStep,
        tourId
      );
      if (position) {
        setElementPosition(position);
      }
    }
  }, [currentStep, steps, tourId]);

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
      const message = 'Attempted to start completed tour';
      if (import.meta.env.DEV) {
        console.warn(`[Tour] ${message}. Call setIsTourCompleted(false) first to restart.`);
      }
      logError(message, {
        errorId: 'TOUR_START_WHEN_COMPLETED',
        metadata: { tourId }
      });
      return;
    }

    if (steps.length === 0) {
      const message = 'Cannot start tour: No steps defined';
      if (import.meta.env.DEV) {
        console.warn(`[Tour] ${message}. Call setSteps() with tour step configuration before starting.`);
      }
      logError(message, {
        errorId: 'TOUR_START_NO_STEPS',
        metadata: { tourId }
      });
      return;
    }

    setDirection("next");
    setCurrentStep(0);
  }, [isTourCompleted, steps.length, tourId]);

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
  const isMobile = useIsMobile();

  if (isTourCompleted || steps.length === 0 || currentStep > -1) {
    return null;
  }

  const handleSkip = () => {
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen}>
      {isMobile ? (
        <MobileTourDialog onStartTour={startTour} onSkip={handleSkip} />
      ) : (
        <DesktopTourDialog onStartTour={startTour} onSkip={handleSkip} />
      )}
    </AlertDialog>
  );
}

// ============================================================================
// DesktopTourDialog Component (Two-Column Desktop Layout)
// ============================================================================
/**
 * DesktopTourDialog uses a two-column layout optimized for larger screens:
 * - Left sidebar (280px): Profile, social links
 * - Right content area: Features, tech stack, actions
 *
 * We maintain a separate implementation from MobileTourDialog to provide
 * the best experience for each viewport. Desktop users get a spacious
 * side-by-side layout while mobile users get an optimized single-column
 * compact layout.
 */
function DesktopTourDialog({
  onStartTour,
  onSkip
}: {
  onStartTour: () => void;
  onSkip: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [imageError, setImageError] = useState(false);

  const imageAnimation = reducedMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    }
    : {
      initial: { scale: 0.95, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
    };

  const imageTransition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.2, ease: "easeOut" as const };


  return (
    <AlertDialogContent className="max-w-4xl w-[calc(100vw-32px)] sm:w-full p-0 flex flex-col overflow-hidden bg-card border-border shadow-xl">
      <AlertDialogTitle className="sr-only">Welcome Tour - Learn about Vana's AI features</AlertDialogTitle>
      <AlertDialogDescription className="sr-only">
        Learn about Vana's core features, tooling, and how the tour works before you start.
      </AlertDialogDescription>
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Column - Profile & Connect (Desktop Only) */}
        <div className="hidden md:flex md:w-[280px] bg-muted/30 md:border-r border-border p-8 flex-col items-center justify-start text-center space-y-6 pt-12">
          <motion.div
            {...imageAnimation}
            transition={imageTransition}
          >
            {imageError ? (
              <div className="size-32 rounded-full bg-muted flex items-center justify-center shadow-lg">
                <span className="text-3xl text-muted-foreground">N</span>
              </div>
            ) : (
              <img
                src="/nick-profile.jpeg"
                alt=""
                role="presentation"
                className="size-32 rounded-full object-cover shadow-lg ring-2 ring-border"
                onError={(e) => {
                  logError(
                    `Profile image failed to load: ${e.currentTarget.src}`,
                    {
                      errorId: 'TOUR_PROFILE_IMAGE_LOAD_FAILED',
                      metadata: {
                        src: e.currentTarget.src,
                        naturalWidth: e.currentTarget.naturalWidth,
                        naturalHeight: e.currentTarget.naturalHeight,
                      }
                    }
                  );
                  setImageError(true);
                }}
              />
            )}
          </motion.div>

          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">Nick Bohmer</h3>
            <p className="text-sm text-muted-foreground">Product Leader</p>
          </div>

          <div className="w-full space-y-3">
            <Button
              asChild
              className="w-full bg-[#0077b5] text-white hover:bg-[#0077b5]/90 border-none"
            >
              <a
                href="https://www.linkedin.com/in/nickbohmer/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <Linkedin className="size-4 fill-white text-white" />
                <span>Connect on LinkedIn</span>
              </a>
            </Button>

            <Button
              asChild
              variant="secondary"
              className="w-full"
            >
              <a
                href="https://github.com/NickB03/llm-chat-site"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <Github className="size-4" />
                <span>View on GitHub</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="flex-1 flex flex-col p-5 md:p-6 max-h-[85vh] md:max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance">
              Welcome to Vana
            </h2>
            <p className="text-sm text-muted-foreground mt-2 text-pretty leading-relaxed">
              A personal sandbox for exploring production AI workflows.
            </p>
          </div>

          {/* Capabilities - Clean 3-column grid */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground/70 uppercase mb-3">
              Capabilities
            </h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Live Code</p>
                <p className="text-xs text-muted-foreground">Build charts, games, interactive UIs & more</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Chat</p>
                <p className="text-xs text-muted-foreground">Real-time SSE streaming</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Search</p>
                <p className="text-xs text-muted-foreground">Web search with query rewriting</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Images</p>
                <p className="text-xs text-muted-foreground">Text-to-image via Gemini</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Reasoning</p>
                <p className="text-xs text-muted-foreground">Extended thinking with visible CoT</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Tool Calling</p>
                <p className="text-xs text-muted-foreground">Multi-tool function calling</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Skills</p>
                <p className="text-xs text-muted-foreground">Extensible prompt system</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Deep Research</p>
                <p className="text-xs text-muted-foreground">Multi-step research with citations</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Security</p>
                <p className="text-xs text-muted-foreground">Multi-layer: auth, RLS, XSS, rate limiting</p>
              </div>
            </div>
          </div>

          {/* Stack - Clean typography */}
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground/70 uppercase mb-3">
              Stack
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="text-muted-foreground w-20 shrink-0">Frontend</span>
                <span className="text-foreground">React, TypeScript, Tailwind CSS, Vite</span>
              </div>
              <div className="flex">
                <span className="text-muted-foreground w-20 shrink-0">Backend</span>
                <span className="text-foreground">Supabase, Edge Functions, PostgreSQL</span>
              </div>
              <div className="flex">
                <span className="text-muted-foreground w-20 shrink-0">Built with</span>
                <span className="text-foreground">Claude Code (Opus 4.5), VS Code, Docker, GitHub Actions</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5 pt-4 border-t border-border/50">
            <Button onClick={onSkip} variant="ghost" className="flex-1 h-11 font-medium bg-muted/50 hover:bg-muted">
              Skip
            </Button>
            <Button onClick={onStartTour} className="flex-1 h-11 font-medium bg-primary hover:bg-primary/90">
              Start the Tour
            </Button>
          </div>
        </div>
      </div>
    </AlertDialogContent>
  );
}

// ============================================================================
// MobileTourDialog Component (Single-Page Compact Layout)
// ============================================================================

/**
 * Mobile tour dialog presents all content on a single page with tight spacing:
 * - Header with profile, name, social links
 * - Welcome title and subtitle
 * - Capabilities grid (2-column, 9 items)
 * - Stack section (3 items)
 * - CTA buttons
 */
function MobileTourDialog({
  onStartTour,
  onSkip
}: {
  onStartTour: () => void;
  onSkip: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [imageError, setImageError] = useState(false);

  const imageAnimation = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 } };

  const imageTransition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <AlertDialogContent className="w-[calc(100vw-32px)] max-w-[360px] p-0 flex flex-col overflow-hidden bg-card border-border shadow-xl rounded-xl">
      <AlertDialogTitle className="sr-only">Welcome Tour</AlertDialogTitle>
      <AlertDialogDescription className="sr-only">
        Learn about Vana's capabilities and start the tour.
      </AlertDialogDescription>

      <div className="flex flex-col px-4 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <motion.div {...imageAnimation} transition={imageTransition}>
            {imageError ? (
              <div className="size-9 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm text-muted-foreground">N</span>
              </div>
            ) : (
              <img
                src="/nick-profile.jpeg"
                alt=""
                role="presentation"
                className="size-9 rounded-full object-cover ring-1 ring-border"
                onError={() => setImageError(true)}
              />
            )}
          </motion.div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">Nick Bohmer</h3>
            <p className="text-[11px] text-muted-foreground">Product Leader</p>
          </div>
          <div className="flex items-center">
            <a href="https://github.com/NickB03/llm-chat-site" target="_blank" rel="noopener noreferrer"
               className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="GitHub">
              <Github className="size-4" />
            </a>
            <a href="https://www.linkedin.com/in/nickbohmer/" target="_blank" rel="noopener noreferrer"
               className="p-1.5 text-muted-foreground hover:text-[#0077b5]" aria-label="LinkedIn">
              <Linkedin className="size-4" />
            </a>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-foreground">Welcome to Vana</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          A sandbox for exploring production AI workflows.
        </p>

        {/* Capabilities */}
        <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wide mb-1.5">Capabilities</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-3">
          <div>
            <span className="text-muted-foreground">Live Code</span>
            <p className="text-foreground">Charts, games, UIs</p>
          </div>
          <div>
            <span className="text-muted-foreground">Chat</span>
            <p className="text-foreground">Real-time streaming</p>
          </div>
          <div>
            <span className="text-muted-foreground">Search</span>
            <p className="text-foreground">Web + query rewriting</p>
          </div>
          <div>
            <span className="text-muted-foreground">Images</span>
            <p className="text-foreground">Text-to-image</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reasoning</span>
            <p className="text-foreground">Extended thinking</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tools</span>
            <p className="text-foreground">Multi-tool calling</p>
          </div>
          <div>
            <span className="text-muted-foreground">Skills</span>
            <p className="text-foreground">Extensible prompts</p>
          </div>
          <div>
            <span className="text-muted-foreground">Research</span>
            <p className="text-foreground">Multi-step + citations</p>
          </div>
          <div>
            <span className="text-muted-foreground">Security</span>
            <p className="text-foreground">Auth, RLS, XSS</p>
          </div>
        </div>

        {/* Stack */}
        <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wide mb-1.5">Stack</p>
        <div className="space-y-1 text-[12px] mb-3">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">Frontend</span>
            <span className="text-foreground">React, TypeScript, Tailwind, Vite</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">Backend</span>
            <span className="text-foreground">Supabase, Edge Functions, PostgreSQL</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">Built with</span>
            <span className="text-foreground">Claude Code, VS Code, Docker</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Button onClick={onSkip} variant="ghost" className="flex-1 h-10 text-sm bg-muted/40 hover:bg-muted rounded-lg">
            Skip
          </Button>
          <Button onClick={onStartTour} className="flex-1 h-10 text-sm font-medium rounded-lg">
            Start Tour
          </Button>
        </div>
      </div>
    </AlertDialogContent>
  );
}
