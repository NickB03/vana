import { useEffect } from 'react';

/**
 * usePreventPullToRefresh - Prevents pull-to-refresh on iOS Safari
 *
 * iOS Safari doesn't respect CSS `overscroll-behavior: none` for pull-to-refresh.
 * This hook uses JavaScript to prevent the default touchmove behavior when
 * scrolling would go beyond the top of the page.
 *
 * How it works:
 * 1. Listens for touchstart to track initial touch position
 * 2. On touchmove, checks if user is pulling down at the top of the page
 * 3. If so, prevents the default behavior (which triggers pull-to-refresh)
 *
 * @param containerRef - Optional ref to a specific scroll container.
 *                       If not provided, applies to the document body.
 */
export function usePreventPullToRefresh(containerRef?: React.RefObject<HTMLElement>) {
  useEffect(() => {
    let startY = 0;
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Store the initial touch position
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;

      // Only prevent vertical overscroll, allow horizontal swipes
      if (Math.abs(deltaY) < Math.abs(deltaX)) return;

      const target = containerRef?.current || document.documentElement;
      const scrollTop = target.scrollTop || window.scrollY || 0;

      // Prevent pull-to-refresh: user is at top and pulling down
      if (scrollTop <= 0 && deltaY > 0) {
        e.preventDefault();
        return;
      }

      // Prevent bounce at bottom: user is at bottom and pulling up
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight || window.innerHeight;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (isAtBottom && deltaY < 0) {
        e.preventDefault();
      }
    };

    // Add listeners with { passive: false } to allow preventDefault()
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef]);
}

/**
 * Alternative: Simple component wrapper for preventing pull-to-refresh
 * Use this if you prefer a component-based approach
 */
export function PreventPullToRefresh({ children }: { children: React.ReactNode }) {
  usePreventPullToRefresh();
  return <>{children}</>;
}
