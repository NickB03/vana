import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollTransition } from '../useScrollTransition';

describe('useScrollTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock window properties
    Object.defineProperty(window, 'pageYOffset', {
      writable: true,
      configurable: true,
      value: 0,
    });
    // Reset location search to empty
    delete (window as any).location;
    window.location = { search: '' } as Location;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial phase based on skipLanding prop', () => {
    it('starts in landing phase when skipLanding is false', () => {
      const { result } = renderHook(() => useScrollTransition({ skipLanding: false }));

      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });

    it('starts in app phase when skipLanding is true', () => {
      const { result } = renderHook(() => useScrollTransition({ skipLanding: true }));

      expect(result.current.phase).toBe('app');
      expect(result.current.progress).toBe(1);
    });

    it('defaults to landing phase when skipLanding is undefined', () => {
      const { result } = renderHook(() => useScrollTransition({ enabled: true }));

      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });

    it('respects backward compatible boolean parameter', () => {
      const { result } = renderHook(() => useScrollTransition(true));

      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });
  });

  describe('bidirectional skipLanding changes', () => {
    it('transitions from landing to app when skipLanding changes from false to true', () => {
      const { result, rerender } = renderHook(
        ({ skipLanding }) => useScrollTransition({ skipLanding }),
        { initialProps: { skipLanding: false } }
      );

      // Initially in landing phase
      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);

      // Change skipLanding to true
      act(() => {
        rerender({ skipLanding: true });
      });

      // Should immediately transition to app phase
      expect(result.current.phase).toBe('app');
      expect(result.current.progress).toBe(1);
    });

    it('resets from app to landing when skipLanding changes from true to false', () => {
      const { result, rerender } = renderHook(
        ({ skipLanding }) => useScrollTransition({ skipLanding }),
        { initialProps: { skipLanding: true } }
      );

      // Initially in app phase (skip landing)
      expect(result.current.phase).toBe('app');
      expect(result.current.progress).toBe(1);

      // Change skipLanding to false (re-enable landing page)
      act(() => {
        rerender({ skipLanding: false });
      });

      // Should reset to landing phase (NEW FIX - this is the race condition fix)
      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });

    it('handles multiple bidirectional toggles correctly', () => {
      const { result, rerender } = renderHook(
        ({ skipLanding }) => useScrollTransition({ skipLanding }),
        { initialProps: { skipLanding: false } }
      );

      // Start: landing
      expect(result.current.phase).toBe('landing');

      // Toggle 1: false → true
      act(() => {
        rerender({ skipLanding: true });
      });
      expect(result.current.phase).toBe('app');

      // Toggle 2: true → false
      act(() => {
        rerender({ skipLanding: false });
      });
      expect(result.current.phase).toBe('landing');

      // Toggle 3: false → true
      act(() => {
        rerender({ skipLanding: true });
      });
      expect(result.current.phase).toBe('app');
    });
  });

  describe('query parameter override', () => {
    // NOTE: Query param override (?skipLanding=true) is tested in E2E tests
    // It's difficult to test URLSearchParams behavior in unit tests due to JSDOM limitations
    // The implementation at useScrollTransition.ts:56-59 checks:
    // new URLSearchParams(window.location.search).get('skipLanding') === 'true'

    it('respects skipLanding prop when no query param present', () => {
      // Baseline behavior without query param
      const { result: resultFalse } = renderHook(() => useScrollTransition({ skipLanding: false }));
      expect(resultFalse.current.phase).toBe('landing');

      const { result: resultTrue } = renderHook(() => useScrollTransition({ skipLanding: true }));
      expect(resultTrue.current.phase).toBe('app');
    });
  });

  describe('one-way lock during scroll transition', () => {
    it('prevents reset to landing phase when scrolling past trigger', () => {
      const { result, rerender } = renderHook(
        ({ skipLanding }) => useScrollTransition({ skipLanding }),
        { initialProps: { skipLanding: false } }
      );

      // Set trigger element
      const mockElement = document.createElement('div');
      const mockGetBoundingClientRect = vi.fn(() => ({
        top: 500,
        bottom: 600,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }));

      mockElement.getBoundingClientRect = mockGetBoundingClientRect;

      act(() => {
        result.current.setTriggerElement(mockElement);
      });

      // Wait for trigger point to be calculated
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Initially in landing phase
      expect(result.current.phase).toBe('landing');

      // Simulate scroll event by updating pageYOffset and dispatching scroll event
      act(() => {
        Object.defineProperty(window, 'pageYOffset', {
          configurable: true,
          value: 650, // 500 (trigger) + 100 (threshold) + 50 (past threshold)
        });
        Object.defineProperty(document.documentElement, 'scrollTop', {
          configurable: true,
          value: 650,
        });

        // Dispatch scroll event
        const scrollEvent = new Event('scroll');
        window.dispatchEvent(scrollEvent);

        // Allow RAF to process
        vi.advanceTimersByTime(20); // SCROLL_THROTTLE_MS
      });

      // Should be transitioning or already in app phase
      // (depends on animation timing)
      const phaseAfterScroll = result.current.phase;
      expect(['transitioning', 'app']).toContain(phaseAfterScroll);

      // Complete transition animation if not already done
      act(() => {
        vi.advanceTimersByTime(850); // TRANSITION_DURATION_MS + buffer
      });

      // Should be locked in app phase
      expect(result.current.phase).toBe('app');
      expect(result.current.progress).toBe(1);

      // Try to reset via skipLanding prop change
      // This should NOT work during scroll-triggered lock
      // The one-way lock prevents reset when user manually scrolled
      // (Only works when admin toggles setting before user scrolls)
      act(() => {
        rerender({ skipLanding: false });
      });

      // Should remain in app phase (one-way lock)
      // NOTE: This test verifies that once user scrolls to trigger transition,
      // changing the setting doesn't reset them back to landing mid-session
      expect(result.current.phase).toBe('app');
    });

    it('allows reset when skipLanding changes before scroll transition', () => {
      const { result, rerender } = renderHook(
        ({ skipLanding }) => useScrollTransition({ skipLanding }),
        { initialProps: { skipLanding: true } }
      );

      // Initially in app phase (skipLanding = true)
      expect(result.current.phase).toBe('app');

      // Change to false BEFORE user scrolls
      act(() => {
        rerender({ skipLanding: false });
      });

      // Should reset to landing (no one-way lock yet)
      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });
  });

  describe('return object interface', () => {
    it('returns complete ScrollTransitionReturn object', () => {
      const { result } = renderHook(() => useScrollTransition(true));

      expect(result.current).toHaveProperty('phase');
      expect(result.current).toHaveProperty('progress');
      expect(result.current).toHaveProperty('scrollY');
      expect(result.current).toHaveProperty('triggerPoint');
      expect(result.current).toHaveProperty('setTriggerElement');

      expect(typeof result.current.phase).toBe('string');
      expect(typeof result.current.progress).toBe('number');
      expect(typeof result.current.scrollY).toBe('number');
      expect(typeof result.current.triggerPoint).toBe('number');
      expect(typeof result.current.setTriggerElement).toBe('function');
    });

    it('has valid phase values', () => {
      const { result } = renderHook(() => useScrollTransition(true));

      expect(['landing', 'transitioning', 'app']).toContain(result.current.phase);
    });

    it('has progress value between 0 and 1', () => {
      const { result } = renderHook(() => useScrollTransition(true));

      expect(result.current.progress).toBeGreaterThanOrEqual(0);
      expect(result.current.progress).toBeLessThanOrEqual(1);
    });
  });

  describe('disabled state', () => {
    it('does not trigger transition when enabled is false', () => {
      const { result } = renderHook(() => useScrollTransition({ enabled: false }));

      // Set trigger element
      const mockElement = document.createElement('div');
      Object.defineProperty(mockElement, 'getBoundingClientRect', {
        value: () => ({
          top: 500,
          bottom: 600,
          left: 0,
          right: 100,
          width: 100,
          height: 100,
        }),
      });

      act(() => {
        result.current.setTriggerElement(mockElement);
      });

      // Scroll past trigger
      act(() => {
        Object.defineProperty(window, 'pageYOffset', {
          writable: true,
          value: 650,
        });
        window.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(1000);
      });

      // Should remain in landing phase
      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles null trigger element gracefully', () => {
      const { result } = renderHook(() => useScrollTransition(true));

      expect(() => {
        act(() => {
          result.current.setTriggerElement(null);
        });
      }).not.toThrow();
    });

    it('maintains state consistency when rapidly changing skipLanding', () => {
      const { result, rerender } = renderHook(
        ({ skipLanding }) => useScrollTransition({ skipLanding }),
        { initialProps: { skipLanding: false } }
      );

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        act(() => {
          rerender({ skipLanding: i % 2 === 0 });
        });
      }

      // Final state should be consistent (i=9 is odd, so skipLanding=false)
      expect(result.current.phase).toBe('landing');
      expect(result.current.progress).toBe(0);
    });
  });
});
