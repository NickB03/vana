"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { logError, logForDebugging } from "@/utils/errorLogging";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  X,
  Github,
  Linkedin,
  MessageSquare,
  Search,
  FileCode,
  Image as ImageIcon,
  Brain,
  Shield,
  Code2,
  Server,
  Sparkles,
  Cpu,
  Palette
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
// DesktopTourDialog Component (Original Single-Page Layout)
// ============================================================================

// ============================================================================
// DesktopTourDialog Component (Now matches Mobile "Mockup" Layout)
// ============================================================================

function DesktopTourDialog({
  onStartTour,
  onSkip
}: {
  onStartTour: () => void;
  onSkip: () => void;
}) {
  // reusing the same layout logic as Mobile for consistency with the requested mockup
  // If desktop needs to be different later, we can diverge.
  // For now, "align with this one" implies the specific card look.
  return <MobileTourDialog onStartTour={onStartTour} onSkip={onSkip} />;
}

// ============================================================================
// MobileTourDialog Component (Two-Page Progressive Disclosure)
// ============================================================================

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
    ? {
      initial: { scale: 0.95, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
    }
    : {
      initial: { scale: 0.85, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
    };

  const imageTransition = reducedMotion
    ? { duration: 0.2 }
    : { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] };

  return (
    <AlertDialogContent className="w-[calc(100vw-32px)] max-h-[100dvh] p-0 flex flex-col overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Header: Photo + Name + Socials */}
        <div className="flex items-center gap-3 shrink-0 mb-3">
          <motion.div
            className="relative flex-shrink-0"
            {...imageAnimation}
            transition={imageTransition}
          >
            {imageError ? (
              <div className="relative size-12 rounded-full bg-muted flex items-center justify-center shadow-md">
                <span className="text-lg text-muted-foreground">N</span>
              </div>
            ) : (
              <img
                src="/nick-profile.jpeg"
                alt=""
                role="presentation"
                className="relative size-12 rounded-full object-cover shadow-md ring-1 ring-primary/10"
                onError={(e) => {
                  logError(
                    `Profile image failed to load: ${e.currentTarget.src}`,
                    {
                      errorId: 'TOUR_PROFILE_IMAGE_LOAD_FAILED',
                      metadata: {
                        src: e.currentTarget.src,
                      }
                    }
                  );
                  setImageError(true);
                }}
              />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-foreground truncate">Nick Bohmer</h3>
            <p className="text-xs text-muted-foreground truncate">Product Leader</p>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-full border border-border/20">
            <a
              href="https://github.com/NickB03/llm-chat-site"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full text-foreground/70 hover:text-foreground hover:bg-background transition-colors"
              aria-label="View on GitHub"
            >
              <Github className="size-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/nickbohmer/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full text-foreground/70 hover:text-[#0077b5] hover:bg-background transition-colors"
              aria-label="Connect on LinkedIn"
            >
              <Linkedin className="size-4" />
            </a>
          </div>
        </div>

        {/* Intro Text - Unified */}
        <div className="shrink-0 mb-4 px-4 space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Welcome to Vana.</h2>
          <p className="text-xs text-foreground/90 italic leading-relaxed relative z-10">
            I started Vana to push myself to learn, build, and grow by using AI tools in real-world production workflows. It's still a work in progress, but I'm excited to share what I've built so far.
          </p>
        </div>

        {/* Actions - Moved up per mockup */}
        <div className="shrink-0 px-4 mb-6 space-y-3">
          <Button
            onClick={onStartTour}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-full transition-all"
          >
            Start the Tour
          </Button>
          <button
            onClick={onSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Content Lists */}
        <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto px-4 pb-4">

          {/* Current Release Section */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Current Release
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/30">
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground/90 leading-tight">LLM chat</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/30">
                <Search className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground/90 leading-tight">Search</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/30">
                <FileCode className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground/90 leading-tight">Artifacts</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/30">
                <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground/90 leading-tight">Images</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/30">
                <Brain className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground/90 leading-tight">Reasoning</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/30">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground/90 leading-tight">Safety</span>
              </div>
            </div>
          </div>

          {/* Built With Section (Accordion) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Code2 className="w-3 h-3" />
              Built With
            </h4>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="frontend" className="border-border/40">
                <AccordionTrigger className="py-2 text-xs hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-blue-400" />
                    <span>Frontend</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-1 pb-2">
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">React 18</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">TypeScript</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Tailwind CSS</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Vite</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Framer Motion</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Radix UI</div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="backend" className="border-border/40">
                <AccordionTrigger className="py-2 text-xs hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-green-400" />
                    <span>Backend</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 pt-1 pb-2">
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Supabase</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Edge Functions</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">PostgreSQL</div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai" className="border-border/40 border-b-0">
                <AccordionTrigger className="py-2 text-xs hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>AI Models</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-2 pt-1 pb-2">
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">GLM 4.7</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">GLM 4.5 Air</div>
                    <div className="text-[10px] px-2 py-1 rounded bg-muted/50 border border-border/20">Gemini Flash 2.5 Image</div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed mt-2">
            This is a living project, and I'm still improving it. You may run into bugs — thanks for checking it out!
          </p>

        </div>



      </div>
    </AlertDialogContent>
  );
}
