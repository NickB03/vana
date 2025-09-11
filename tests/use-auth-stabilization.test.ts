/**
 * Tests for useAuthStabilization Hook
 * 
 * This test suite validates:
 * 1. Debounced storage handlers prevent oscillation
 * 2. Redirect loop detection with timestamp tracking
 * 3. Auth state stabilization timing
 * 4. History management and cleanup
 * 5. Cross-tab synchronization simulation
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthStabilization } from '@/hooks/use-auth-stabilization';
import { useAuth } from '@/contexts/auth-context';

// Mock the auth context
jest.mock('@/contexts/auth-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useAuthStabilization Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Debounced State Stabilization', () => {
    it('should debounce rapid auth state changes', async () => {
      // Start with loading state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
      } as any);

      const { result, rerender } = renderHook(() => useAuthStabilization());

      // Initially should not be stable
      expect(result.current.isStable).toBe(false);
      expect(result.current.isInitialized).toBe(false);

      // Change to not loading
      act(() => {
        mockUseAuth.mockReturnValue({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        } as any);
        rerender();
      });

      // Still should not be stable immediately
      expect(result.current.isStable).toBe(false);

      // Fast forward through debounce delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Now should be stable
      expect(result.current.isStable).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.stableAuth).toBe(false);
      expect(result.current.stableUser).toBe(null);
    });

    it('should reset debounce timer on each state change', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
      } as any);

      const { result, rerender } = renderHook(() => useAuthStabilization());

      // Make rapid changes
      const stateChanges = [
        { isAuthenticated: false, isLoading: false, user: null },
        { isAuthenticated: true, isLoading: false, user: { id: '1' } },
        { isAuthenticated: true, isLoading: false, user: { id: '1', name: 'Test' } },
      ];

      for (const [index, state] of stateChanges.entries()) {
        act(() => {
          mockUseAuth.mockReturnValue(state as any);
          rerender();
          // Advance time but not enough to stabilize
          jest.advanceTimersByTime(100);
        });

        // Should remain unstable during rapid changes
        expect(result.current.isStable).toBe(false);
      }

      // Now wait for full stabilization
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should be stable with final state
      expect(result.current.isStable).toBe(true);
      expect(result.current.stableAuth).toBe(true);
      expect(result.current.stableUser).toEqual({ id: '1', name: 'Test' });
    });

    it('should handle initial stabilization on mount', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1' },
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      // Initially not stable
      expect(result.current.isStable).toBe(false);
      expect(result.current.isInitialized).toBe(false);

      // Fast forward through initial stabilization
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should be stable after initial delay
      expect(result.current.isStable).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.stableAuth).toBe(true);
      expect(result.current.stableUser).toEqual({ id: '1' });
    });
  });

  describe('Redirect Loop Prevention', () => {
    it('should detect redirect loops within time window', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      // Stabilize first
      act(() => {
        jest.advanceTimersByTime(150);
      });

      const targetPath = '/login';

      // Add multiple redirects to same path within time window
      act(() => {
        result.current.addRedirectToHistory(targetPath);
        result.current.addRedirectToHistory(targetPath);
        result.current.addRedirectToHistory(targetPath);
      });

      // Should detect loop
      expect(result.current.wouldCreateRedirectLoop(targetPath)).toBe(true);
    });

    it('should allow redirects after time window expires', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      const targetPath = '/login';

      // Add redirects
      act(() => {
        result.current.addRedirectToHistory(targetPath);
        result.current.addRedirectToHistory(targetPath);
        result.current.addRedirectToHistory(targetPath);
      });

      // Initially should detect loop
      expect(result.current.wouldCreateRedirectLoop(targetPath)).toBe(true);

      // Advance time beyond the window (5 seconds + 1)
      act(() => {
        jest.advanceTimersByTime(5001);
      });

      // Should no longer detect loop
      expect(result.current.wouldCreateRedirectLoop(targetPath)).toBe(false);
    });

    it('should limit redirect history size', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Add more than MAX_REDIRECT_HISTORY (10) entries
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addRedirectToHistory(`/path-${i}`);
        }
      });

      // History should be limited to 10 entries
      expect(result.current.redirectHistory.length).toBeLessThanOrEqual(10);
    });

    it('should cleanup old entries automatically', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Add some redirects
      act(() => {
        result.current.addRedirectToHistory('/old-path');
        result.current.addRedirectToHistory('/path-1');
      });

      expect(result.current.redirectHistory).toContain('/old-path');

      // Advance time beyond cleanup threshold
      act(() => {
        jest.advanceTimersByTime(5001);
        // Add a new redirect to trigger cleanup
        result.current.addRedirectToHistory('/new-path');
      });

      // Old entries should be cleaned up
      expect(result.current.redirectHistory).not.toContain('/old-path');
      expect(result.current.redirectHistory).toContain('/new-path');
    });
  });

  describe('Safe Redirect Conditions', () => {
    it('should only allow safe redirects when stable', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      // Before stabilization
      expect(result.current.canSafelyRedirect('/login')).toBe(false);

      // After stabilization
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.canSafelyRedirect('/login')).toBe(true);
    });

    it('should prevent unsafe redirects even when stable', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      const targetPath = '/login';

      // Create redirect loop condition
      act(() => {
        result.current.addRedirectToHistory(targetPath);
        result.current.addRedirectToHistory(targetPath);
        result.current.addRedirectToHistory(targetPath);
      });

      // Should prevent unsafe redirect even when stable
      expect(result.current.canSafelyRedirect(targetPath)).toBe(false);
    });

    it('should provide canRedirect convenience property', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      // Before stabilization
      expect(result.current.canRedirect).toBe(false);

      // After stabilization
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.canRedirect).toBe(true);
    });
  });

  describe('History Management', () => {
    it('should provide redirect history as array of paths', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      const paths = ['/login', '/dashboard', '/profile'];

      act(() => {
        paths.forEach(path => result.current.addRedirectToHistory(path));
      });

      expect(result.current.redirectHistory).toEqual(paths);
    });

    it('should allow clearing redirect history', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Add some history
      act(() => {
        result.current.addRedirectToHistory('/login');
        result.current.addRedirectToHistory('/dashboard');
      });

      expect(result.current.redirectHistory.length).toBe(2);

      // Clear history
      act(() => {
        result.current.clearRedirectHistory();
      });

      expect(result.current.redirectHistory.length).toBe(0);
    });
  });

  describe('Edge Cases and Cross-Tab Simulation', () => {
    it('should handle rapid authentication changes from external sources', async () => {
      // Simulate external auth state changes (like from another tab)
      const authStates = [
        { isAuthenticated: false, isLoading: false, user: null },
        { isAuthenticated: true, isLoading: false, user: { id: '1' } },
        { isAuthenticated: false, isLoading: false, user: null },
        { isAuthenticated: true, isLoading: false, user: { id: '2' } },
      ];

      mockUseAuth.mockReturnValue(authStates[0] as any);

      const { result, rerender } = renderHook(() => useAuthStabilization());

      // Simulate rapid external changes
      for (let i = 1; i < authStates.length; i++) {
        act(() => {
          mockUseAuth.mockReturnValue(authStates[i] as any);
          rerender();
          // Don't wait for stabilization between changes
          jest.advanceTimersByTime(50);
        });

        // Should remain unstable during rapid changes
        expect(result.current.isStable).toBe(false);
      }

      // Finally stabilize
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should be stable with final state
      expect(result.current.isStable).toBe(true);
      expect(result.current.stableAuth).toBe(true);
      expect(result.current.stableUser).toEqual({ id: '2' });
    });

    it('should handle user object mutations gracefully', async () => {
      const baseUser = { id: '1', name: 'Test' };
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: baseUser,
      } as any);

      const { result, rerender } = renderHook(() => useAuthStabilization());

      // Stabilize initially
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.stableUser).toEqual(baseUser);

      // Simulate user object mutation
      const updatedUser = { ...baseUser, email: 'test@example.com' };
      act(() => {
        mockUseAuth.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          user: updatedUser,
        } as any);
        rerender();
      });

      // Should destabilize temporarily
      expect(result.current.isStable).toBe(false);

      // Re-stabilize with new user data
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.isStable).toBe(true);
      expect(result.current.stableUser).toEqual(updatedUser);
    });

    it('should handle loading state oscillation', async () => {
      // Simulate loading state oscillation (common with network issues)
      const states = [
        { isAuthenticated: false, isLoading: true, user: null },
        { isAuthenticated: false, isLoading: false, user: null },
        { isAuthenticated: false, isLoading: true, user: null },
        { isAuthenticated: false, isLoading: false, user: null },
        { isAuthenticated: true, isLoading: false, user: { id: '1' } },
      ];

      mockUseAuth.mockReturnValue(states[0] as any);

      const { result, rerender } = renderHook(() => useAuthStabilization());

      // Simulate oscillation
      for (let i = 1; i < states.length - 1; i++) {
        act(() => {
          mockUseAuth.mockReturnValue(states[i] as any);
          rerender();
          jest.advanceTimersByTime(100); // Not enough to stabilize
        });

        expect(result.current.isStable).toBe(false);
      }

      // Final successful auth
      act(() => {
        mockUseAuth.mockReturnValue(states[states.length - 1] as any);
        rerender();
        jest.advanceTimersByTime(150);
      });

      // Should finally be stable
      expect(result.current.isStable).toBe(true);
      expect(result.current.stableAuth).toBe(true);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should cleanup timers on unmount', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result, unmount } = renderHook(() => useAuthStabilization());

      // Start stabilization process
      act(() => {
        jest.advanceTimersByTime(100); // Partial delay
      });

      expect(result.current.isStable).toBe(false);

      // Unmount before stabilization completes
      unmount();

      // Advance time after unmount
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not throw or cause issues (timer should be cleaned up)
      expect(() => {
        jest.runAllTimers();
      }).not.toThrow();
    });

    it('should clear redirect history on unmount', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result, unmount } = renderHook(() => useAuthStabilization());

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Add some history
      act(() => {
        result.current.addRedirectToHistory('/login');
      });

      expect(result.current.redirectHistory.length).toBe(1);

      // Unmount should clear history
      unmount();

      // Re-mount should start with empty history
      const { result: newResult } = renderHook(() => useAuthStabilization());
      
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(newResult.current.redirectHistory.length).toBe(0);
    });

    it('should handle multiple timer operations without memory leaks', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      } as any);

      const { result, rerender } = renderHook(() => useAuthStabilization());

      // Create many timer operations
      for (let i = 0; i < 20; i++) {
        act(() => {
          mockUseAuth.mockReturnValue({
            isAuthenticated: i % 2 === 0,
            isLoading: false,
            user: i % 2 === 0 ? { id: `${i}` } : null,
          } as any);
          rerender();
          jest.advanceTimersByTime(50); // Not enough to stabilize
        });
      }

      // Final stabilization
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should be stable without memory issues
      expect(result.current.isStable).toBe(true);

      // Should not have excessive pending timers
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});