import { useState, useEffect, useCallback, useRef } from "react";

export type TransitionPhase = "landing" | "transitioning" | "app";

interface ScrollTransitionOptions {
  /** Whether scroll detection is active (default: true) */
  enabled?: boolean;
  /** Skip landing page and go directly to app (from database setting) */
  skipLanding?: boolean;
}

interface ScrollTransitionReturn {
  phase: TransitionPhase;
  progress: number; // 0-1 progress through transition
  scrollY: number;
  triggerPoint: number;
  setTriggerElement: (element: HTMLElement | null) => void;
}

const TRANSITION_DURATION_MS = 800; // 800ms smooth timed animation
const SCROLL_THROTTLE_MS = 16; // ~60fps
const TRIGGER_THRESHOLD_PX = 100; // Scroll 100px past trigger to start transition

/**
 * Easing function for smooth, natural motion
 * Cubic ease-out: fast start, slow end
 */
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Detects scroll position and manages smooth timed transition from landing to app
 *
 * Key Features:
 * - Scroll-triggered: User scrolls past trigger point to start transition
 * - Timed animation: 800ms smooth animation decoupled from scroll position
 * - Easing: Cubic ease-out for natural motion feel
 * - One-way: Once transitioned, stays in app phase
 * - Admin toggle: Can skip landing via database setting (affects ALL users)
 *
 * @param options - Configuration options or boolean for backward compatibility
 * @returns Transition state and progress
 */
export const useScrollTransition = (
  options: ScrollTransitionOptions | boolean = true
): ScrollTransitionReturn => {
  // Handle backward-compatible boolean parameter
  const opts: ScrollTransitionOptions = typeof options === 'boolean'
    ? { enabled: options }
    : options;

  const { enabled = true, skipLanding: skipLandingFromSetting = false } = opts;

  // Check for ?skipLanding=true query param (for E2E tests) or database setting
  const shouldSkipLanding = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('skipLanding') === 'true' ||
    skipLandingFromSetting
  );

  const [state, setState] = useState({
    phase: (shouldSkipLanding ? "app" : "landing") as TransitionPhase,
    progress: shouldSkipLanding ? 1 : 0,
    scrollY: 0,
  });
  const [triggerPoint, setTriggerPoint] = useState(0);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const lastScrollTime = useRef(0);
  const rafId = useRef<number>();
  const hasTransitionedToApp = useRef(shouldSkipLanding); // One-way lock: once in app, stay in app
  const animationStartTime = useRef<number | null>(null); // Timestamp when animation started
  const animationRafId = useRef<number>(); // Separate RAF for animation loop

  // Handle async setting load: if skipLanding becomes true after mount, skip to app
  useEffect(() => {
    if (skipLandingFromSetting && !hasTransitionedToApp.current) {
      hasTransitionedToApp.current = true;
      setState({
        phase: "app",
        progress: 1,
        scrollY: 0,
      });
    }
  }, [skipLandingFromSetting]);

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
   * Smooth timed animation loop
   * Runs independently once triggered by scroll threshold
   */
  const runTransitionAnimation = useCallback(() => {
    if (!animationStartTime.current) {
      animationStartTime.current = Date.now();
    }

    const animate = () => {
      const elapsed = Date.now() - animationStartTime.current!;
      const rawProgress = Math.min(elapsed / TRANSITION_DURATION_MS, 1);
      const easedProgress = easeOutCubic(rawProgress);

      if (rawProgress < 1) {
        // Animation in progress
        setState(prev => ({
          ...prev,
          phase: "transitioning",
          progress: easedProgress,
        }));
        animationRafId.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - lock into app phase
        hasTransitionedToApp.current = true;
        setState(prev => ({
          ...prev,
          phase: "app",
          progress: 1,
        }));
        animationStartTime.current = null;
      }
    };

    animate();
  }, []);

  /**
   * Scroll detection: Triggers timed animation when threshold is crossed
   * Decouples scroll position from animation execution for smoother feel
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
          setState(prev => ({ ...prev, scrollY: currentScrollY }));
          return;
        }

        // Update scrollY for landing phase
        if (animationStartTime.current === null) {
          setState(prev => ({ ...prev, scrollY: currentScrollY }));
        }

        // Check if we've scrolled past trigger threshold
        const distancePastTrigger = currentScrollY - triggerPoint;

        if (distancePastTrigger >= TRIGGER_THRESHOLD_PX && animationStartTime.current === null) {
          // Trigger point crossed - start timed animation
          runTransitionAnimation();
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
      if (animationRafId.current) {
        cancelAnimationFrame(animationRafId.current);
      }
    };
  }, [enabled, triggerPoint, setTriggerElement, runTransitionAnimation]);

  return {
    phase: state.phase,
    progress: state.progress,
    scrollY: state.scrollY,
    triggerPoint,
    setTriggerElement,
  };
};
