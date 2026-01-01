import { useEffect, useRef } from 'react';

/**
 * usePreventOverscroll - Prevents iOS Safari rubber-banding/bounce/drag
 *
 * iOS Safari ignores CSS overscroll-behavior. This hook uses JavaScript
 * with { passive: false } to actually prevent the drag behavior.
 *
 * How it works:
 * 1. Listens for touchstart to track initial touch position
 * 2. On touchmove with { passive: false }, checks:
 *    - If touch target is inside a scrollable element
 *    - If scrollable element is at its scroll boundary
 * 3. Prevents default if:
 *    - Not inside a scrollable element (prevents body drag)
 *    - Inside scrollable element but at boundary (prevents overscroll)
 *
 * Based on iNoBounce/body-scroll-lock patterns that actually work on iOS.
 *
 * @see https://github.com/lazd/iNoBounce
 * @see https://github.com/willmcpo/body-scroll-lock
 */
export function usePreventOverscroll() {
  const startY = useRef(0);
  const startX = useRef(0);

  useEffect(() => {
    // Only run on iOS Safari (or devices that support webkit overflow scrolling)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!isIOS) {
      return;
    }

    /**
     * Find the nearest scrollable ancestor
     */
    const getScrollableAncestor = (el: HTMLElement | null): HTMLElement | null => {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;

        // Check if element can scroll
        const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight;
        const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') &&
          el.scrollWidth > el.clientWidth;

        if (canScrollY || canScrollX) {
          return el;
        }

        el = el.parentElement;
      }
      return null;
    };

    /**
     * Check if element is at scroll boundary
     */
    const isAtScrollBoundary = (
      el: HTMLElement,
      deltaY: number,
      deltaX: number
    ): boolean => {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = el;

      // Pulling down at top
      if (deltaY > 0 && scrollTop <= 0) {
        return true;
      }

      // Pulling up at bottom
      if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight - 1) {
        return true;
      }

      // Pulling right at left edge
      if (deltaX > 0 && scrollLeft <= 0) {
        return true;
      }

      // Pulling left at right edge
      if (deltaX < 0 && scrollLeft + clientWidth >= scrollWidth - 1) {
        return true;
      }

      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Only handle single touch
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY.current;
      const deltaX = currentX - startX.current;

      // Get the touched element
      const target = e.target as HTMLElement;

      // Find if we're inside a scrollable container
      const scrollableAncestor = getScrollableAncestor(target);

      if (!scrollableAncestor) {
        // Not in a scrollable container - prevent all vertical movement
        // This prevents the "body drag" you're experiencing
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          e.preventDefault();
        }
        return;
      }

      // Inside a scrollable container - only prevent at boundaries
      if (isAtScrollBoundary(scrollableAncestor, deltaY, deltaX)) {
        e.preventDefault();
      }
    };

    // CRITICAL: { passive: false } is required for preventDefault to work on iOS Safari
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
}

/**
 * Alternative hook for specific containers
 * Use this when you want to lock scroll on a specific element
 */
export function usePreventOverscrollOnElement(
  ref: React.RefObject<HTMLElement>,
  enabled: boolean = true
) {
  const startY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const element = ref.current;
    if (!element) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!isIOS) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      // Prevent all vertical movement on this element
      if (Math.abs(deltaY) > 0) {
        e.preventDefault();
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [ref, enabled]);
}
