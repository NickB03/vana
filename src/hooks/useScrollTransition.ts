import { useState, useEffect, useCallback, useRef } from "react";

export type TransitionPhase = "landing" | "transitioning" | "app";

interface ScrollTransitionReturn {
  phase: TransitionPhase;
  progress: number; // 0-1 progress through transition
  scrollY: number;
  triggerPoint: number;
  setTriggerElement: (element: HTMLElement | null) => void;
}

const TRANSITION_DURATION_PX = 300; // pixels to complete transition
const SCROLL_THROTTLE_MS = 16; // ~60fps

/**
 * Detects scroll position and manages smooth transition from landing to app
 *
 * @param enabled - Whether scroll detection is active
 * @returns Transition state and progress
 */
export const useScrollTransition = (enabled: boolean = true): ScrollTransitionReturn => {
  const [state, setState] = useState({
    phase: "landing" as TransitionPhase,
    progress: 0,
    scrollY: 0,
  });
  const [triggerPoint, setTriggerPoint] = useState(0);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const lastScrollTime = useRef(0);
  const rafId = useRef<number>();
  const hasTransitionedToApp = useRef(false); // One-way lock: once in app, stay in app

  // Set the element that triggers the transition (e.g., BenefitsSection)
  const setTriggerElement = useCallback((element: HTMLElement | null) => {
    triggerElementRef.current = element;

    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = rect.top + scrollTop;
      setTriggerPoint(elementTop);
    }
  }, []);

  /**
   * Performance optimized scroll handler with single state update
   * Reduces re-renders by batching phase, progress, and scrollY updates
   * One-way transition: landing → transitioning → app (stays in app permanently)
   */
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const now = Date.now();

      // Throttle scroll events for performance
      if (now - lastScrollTime.current < SCROLL_THROTTLE_MS) {
        return;
      }
      lastScrollTime.current = now;

      // Use requestAnimationFrame for smooth updates
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Once transitioned to app, stay in app (one-way lock)
        if (hasTransitionedToApp.current) {
          setState({ phase: "app", progress: 1, scrollY: currentScrollY });
          return;
        }

        // Calculate distance past trigger point
        const distancePastTrigger = currentScrollY - triggerPoint;

        // Determine phase and progress - one-way state machine: landing → transitioning → app
        if (distancePastTrigger < 0) {
          // Before trigger point - stay in landing
          setState({ phase: "landing", progress: 0, scrollY: currentScrollY });
        } else if (distancePastTrigger < TRANSITION_DURATION_PX) {
          // During transition
          const transitionProgress = distancePastTrigger / TRANSITION_DURATION_PX;
          setState({
            phase: "transitioning",
            progress: Math.min(1, Math.max(0, transitionProgress)),
            scrollY: currentScrollY,
          });
        } else {
          // Past transition - lock into app phase permanently
          hasTransitionedToApp.current = true;
          setState({ phase: "app", progress: 1, scrollY: currentScrollY });
        }
      });
    };

    // Initial calculation
    handleScroll();

    // Listen to scroll events with passive flag for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Recalculate trigger point on resize (only if not locked in app phase)
    const handleResize = () => {
      if (triggerElementRef.current && !hasTransitionedToApp.current) {
        setTriggerElement(triggerElementRef.current);
      }
    };
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [enabled, triggerPoint, setTriggerElement]);

  return {
    phase: state.phase,
    progress: state.progress,
    scrollY: state.scrollY,
    triggerPoint,
    setTriggerElement,
  };
};
