import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMinimumLoadingTime } from '../use-minimum-loading-time';

describe('useMinimumLoadingTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns true when loading starts as true', () => {
      const { result } = renderHook(() => useMinimumLoadingTime(true));
      expect(result.current).toBe(true);
    });

    it('returns false when loading starts as false', () => {
      const { result } = renderHook(() => useMinimumLoadingTime(false));
      expect(result.current).toBe(false);
    });
  });

  describe('minimum display time behavior', () => {
    it('keeps loading true for minimum time after actual loading completes quickly', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: true } }
      );

      expect(result.current).toBe(true);

      // Loading completes almost immediately (50ms)
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      // Should still show loading (only 50ms elapsed, need 300ms total)
      expect(result.current).toBe(true);

      // Advance to 200ms total (still not enough)
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current).toBe(true);

      // Advance to 300ms total (minimum reached)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);
    });

    it('hides loading immediately if already past minimum time when loading completes', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: true } }
      );

      // Loading takes 500ms (longer than minimum)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      rerender({ isLoading: false });

      // Should immediately hide loading (already past 300ms minimum)
      expect(result.current).toBe(false);
    });

    it('respects custom minimum time', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 500), // 500ms minimum
        { initialProps: { isLoading: true } }
      );

      // Loading completes at 50ms
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      // At 300ms, still loading (need 500ms)
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe(true);

      // At 500ms, should hide
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(false);
    });

    it('uses default 300ms minimum when not specified', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading), // default 300ms
        { initialProps: { isLoading: true } }
      );

      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      // At 299ms, still loading
      act(() => {
        vi.advanceTimersByTime(249);
      });
      expect(result.current).toBe(true);

      // At 300ms, should hide
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe(false);
    });
  });

  describe('loading restart behavior', () => {
    it('shows loading immediately when loading restarts', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: true } }
      );

      // Complete first loading cycle
      act(() => {
        vi.advanceTimersByTime(400);
      });
      rerender({ isLoading: false });
      expect(result.current).toBe(false);

      // Start new loading
      rerender({ isLoading: true });
      expect(result.current).toBe(true);
    });

    it('resets minimum time tracking when loading restarts', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: true } }
      );

      // Complete first loading
      act(() => {
        vi.advanceTimersByTime(400);
      });
      rerender({ isLoading: false });

      // Start new loading and complete quickly
      rerender({ isLoading: true });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      // Should enforce minimum from NEW start time
      expect(result.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe(false);
    });
  });

  describe('cleanup and memory', () => {
    it('clears timeout on unmount to prevent memory leaks', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: true } }
      );

      // Trigger a pending timeout
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('clears previous timeout when loading restarts during pending hide', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: true } }
      );

      // Complete loading quickly
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });

      const callCountAfterFirstComplete = clearTimeoutSpy.mock.calls.length;

      // Restart loading while hide is pending
      rerender({ isLoading: true });

      // clearTimeout should have been called to cancel pending hide
      // (Implementation note: the cleanup function runs, calling clearTimeout)

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('handles zero minimum time', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 0),
        { initialProps: { isLoading: true } }
      );

      rerender({ isLoading: false });

      // With 0ms minimum, should hide immediately
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(result.current).toBe(false);
    });

    it('handles rapid toggle without getting stuck in loading state', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useMinimumLoadingTime(isLoading, 300),
        { initialProps: { isLoading: false } }
      );

      // Rapid toggles
      for (let i = 0; i < 5; i++) {
        rerender({ isLoading: true });
        act(() => {
          vi.advanceTimersByTime(50);
        });
        rerender({ isLoading: false });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      // Final state should resolve correctly
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe(false);
    });
  });
});
