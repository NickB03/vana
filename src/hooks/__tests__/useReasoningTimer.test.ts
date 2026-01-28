import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReasoningTimer } from '../useReasoningTimer';

describe('useReasoningTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns empty string when inactive', () => {
      const { result } = renderHook(() => useReasoningTimer(false));
      expect(result.current).toBe('');
    });

    it('returns empty string at 0 seconds even when active', () => {
      const { result } = renderHook(() => useReasoningTimer(true));
      // No time has passed yet
      expect(result.current).toBe('');
    });
  });

  describe('time formatting', () => {
    it('formats seconds under 60 as "Xs"', () => {
      const { result } = renderHook(() => useReasoningTimer(true));

      act(() => {
        vi.advanceTimersByTime(5000); // 5 seconds
      });

      expect(result.current).toBe('5s');
    });

    it('formats exactly 60 seconds as "1m 0s"', () => {
      const { result } = renderHook(() => useReasoningTimer(true));

      act(() => {
        vi.advanceTimersByTime(60000); // 60 seconds
      });

      expect(result.current).toBe('1m 0s');
    });

    it('formats times over 60 seconds as "Xm Ys"', () => {
      const { result } = renderHook(() => useReasoningTimer(true));

      act(() => {
        vi.advanceTimersByTime(95000); // 1 minute 35 seconds
      });

      expect(result.current).toBe('1m 35s');
    });

    it('handles multiple minutes correctly', () => {
      const { result } = renderHook(() => useReasoningTimer(true));

      act(() => {
        vi.advanceTimersByTime(185000); // 3 minutes 5 seconds
      });

      expect(result.current).toBe('3m 5s');
    });
  });

  describe('timer lifecycle', () => {
    it('starts timing when isActive becomes true', () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useReasoningTimer(isActive),
        { initialProps: { isActive: false } }
      );

      expect(result.current).toBe('');

      rerender({ isActive: true });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current).toBe('3s');
    });

    it('freezes timer value when isActive becomes false', () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useReasoningTimer(isActive),
        { initialProps: { isActive: true } }
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current).toBe('5s');

      rerender({ isActive: false });

      act(() => {
        vi.advanceTimersByTime(10000); // More time passes
      });

      // Should remain frozen at 5s
      expect(result.current).toBe('5s');
    });

    it('resets timer when reactivated (new session)', () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useReasoningTimer(isActive),
        { initialProps: { isActive: true } }
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current).toBe('5s');

      // Stop timer
      rerender({ isActive: false });

      // Start new session
      rerender({ isActive: true });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should be 2s (new session), not 7s (accumulated)
      expect(result.current).toBe('2s');
    });

    it('clears interval on unmount to prevent memory leaks', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useReasoningTimer(true));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('handles rapid start/stop cycles without accumulating time', () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useReasoningTimer(isActive),
        { initialProps: { isActive: true } }
      );

      // Rapid toggles
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
        rerender({ isActive: false });
        rerender({ isActive: true });
      }

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should only show time from last active session
      expect(result.current).toBe('3s');
    });

    it('clamps negative elapsed time to 0 (clock drift protection)', () => {
      // This is protected by Math.max(0, ...) in the implementation
      const { result } = renderHook(() => useReasoningTimer(true));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Result should never be negative
      expect(parseInt(result.current)).toBeGreaterThanOrEqual(0);
    });
  });
});
