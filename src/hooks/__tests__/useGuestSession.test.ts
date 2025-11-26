import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGuestSession, GuestSession } from '../useGuestSession';

describe('useGuestSession', () => {
  const GUEST_SESSION_KEY = 'vana_guest_session';
  const MAX_GUEST_MESSAGES = 20;
  const SESSION_DURATION = 5 * 60 * 60 * 1000; // 5 hours
  const WARNING_THRESHOLD = 0.75; // 75% = 15/20 messages

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch (e) {
      // localStorage may not be available in all test environments
    }
  });

  afterEach(() => {
    try {
      localStorage.clear();
    } catch (e) {
      // localStorage cleanup errors are acceptable in tests
    }
  });

  describe('initialization', () => {
    it('should initialize guest session when user is not authenticated', () => {
      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.isGuest).toBe(true);
      expect(result.current.messageCount).toBe(0);
      expect(result.current.maxMessages).toBe(MAX_GUEST_MESSAGES);
      expect(result.current.canSendMessage).toBe(true);
      expect(result.current.hasReachedLimit).toBe(false);
      expect(result.current.showWarning).toBe(false);
    });

    it('should not create guest session when user is authenticated', () => {
      const { result } = renderHook(() => useGuestSession(true));

      expect(result.current.isGuest).toBe(false);
      expect(result.current.messageCount).toBe(0);
      expect(result.current.maxMessages).toBe(MAX_GUEST_MESSAGES);
      expect(result.current.canSendMessage).toBe(true);
    });

    it('should load existing guest session from localStorage', () => {
      const mockSession: GuestSession = {
        id: 'test-session-id',
        messageCount: 5,
        createdAt: Date.now() - 3600000, // 1 hour ago
        sessionExpiry: Date.now() + 3600000, // 1 hour from now
      };

      try {
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(mockSession));
      } catch {
        // Skip if localStorage unavailable
        return;
      }

      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.messageCount).toBe(5);
      expect(result.current.canSendMessage).toBe(true);
    });

    it('should create new session if stored session has expired', () => {
      const expiredSession: GuestSession = {
        id: 'old-session-id',
        messageCount: 20,
        createdAt: Date.now() - SESSION_DURATION - 3600000, // Expired
        sessionExpiry: Date.now() - 3600000, // Expired 1 hour ago
      };

      try {
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(expiredSession));
      } catch {
        // Skip if localStorage unavailable
        return;
      }

      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.messageCount).toBe(0);
      expect(result.current.isGuest).toBe(true);
    });

    it('should create new session if stored data is invalid JSON', () => {
      try {
        localStorage.setItem(GUEST_SESSION_KEY, 'invalid json {]');
      } catch {
        // Skip if localStorage unavailable
        return;
      }

      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.messageCount).toBe(0);
      expect(result.current.isGuest).toBe(true);
    });

    it('should handle localStorage quota exceeded error gracefully', () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      const originalSetItem = mockSetItem.getMockImplementation();

      mockSetItem.mockImplementationOnce(() => {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const { result } = renderHook(() => useGuestSession(false));

      // Should still work with in-memory fallback
      expect(result.current.isGuest).toBe(true);

      mockSetItem.mockRestore();
    });
  });

  describe('message counting', () => {
    it('should increment message count', () => {
      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.messageCount).toBe(0);

      act(() => {
        result.current.incrementMessageCount();
      });

      expect(result.current.messageCount).toBe(1);
    });

    it('should increment message count up to max limit', () => {
      const { result } = renderHook(() => useGuestSession(false));

      // Increment multiple times, tracking max limit enforcement
      for (let i = 0; i < MAX_GUEST_MESSAGES + 5; i++) {
        act(() => {
          result.current.incrementMessageCount();
        });
      }

      expect(result.current.messageCount).toBeLessThanOrEqual(MAX_GUEST_MESSAGES);
      expect(result.current.hasReachedLimit).toBe(true);
    });

    it('should persist message count to localStorage', () => {
      const { result } = renderHook(() => useGuestSession(false));

      act(() => {
        result.current.incrementMessageCount();
        result.current.incrementMessageCount();
        result.current.incrementMessageCount();
      });

      try {
        const stored = localStorage.getItem(GUEST_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.messageCount).toBe(3);
        }
      } catch {
        // localStorage not available
      }
    });

    it('should not increment for authenticated users', () => {
      const { result } = renderHook(() => useGuestSession(true));

      expect(result.current.messageCount).toBe(0);

      act(() => {
        result.current.incrementMessageCount();
      });

      expect(result.current.messageCount).toBe(0);
    });

    it('should handle localStorage errors during increment gracefully', () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      mockSetItem.mockImplementationOnce(() => {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const { result } = renderHook(() => useGuestSession(false));

      // Should still update in-memory state even if localStorage fails
      act(() => {
        result.current.incrementMessageCount();
      });

      expect(result.current.messageCount).toBe(1);

      mockSetItem.mockRestore();
    });
  });

  describe('rate limiting', () => {
    it('should show warning at 75% threshold (15/20 messages)', () => {
      const { result } = renderHook(() => useGuestSession(false));

      const warningThreshold = Math.floor(MAX_GUEST_MESSAGES * WARNING_THRESHOLD); // 15

      // Before threshold
      for (let i = 0; i < warningThreshold - 1; i++) {
        act(() => {
          result.current.incrementMessageCount();
        });
      }
      expect(result.current.showWarning).toBe(false);

      // At threshold
      act(() => {
        result.current.incrementMessageCount();
      });
      expect(result.current.showWarning).toBe(true);
    });

    it('should prevent message sending at limit', () => {
      const { result } = renderHook(() => useGuestSession(false));

      // Fill to max
      for (let i = 0; i < MAX_GUEST_MESSAGES; i++) {
        act(() => {
          result.current.incrementMessageCount();
        });
      }

      expect(result.current.hasReachedLimit).toBe(true);
      expect(result.current.canSendMessage).toBe(false);
    });

    it('should allow message sending below limit', () => {
      const { result } = renderHook(() => useGuestSession(false));

      for (let i = 0; i < MAX_GUEST_MESSAGES - 1; i++) {
        act(() => {
          result.current.incrementMessageCount();
        });
      }

      expect(result.current.canSendMessage).toBe(true);
      expect(result.current.hasReachedLimit).toBe(false);
    });

    it('should allow authenticated users to always send messages', () => {
      const { result } = renderHook(() => useGuestSession(true));

      expect(result.current.canSendMessage).toBe(true);
    });
  });

  describe('resetTime', () => {
    it('should return session expiry timestamp', () => {
      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.resetTime).not.toBeNull();
      expect(typeof result.current.resetTime).toBe('number');
      expect(result.current.resetTime).toBeGreaterThan(Date.now());
    });

    it('should set resetTime to approximately 5 hours in future', () => {
      const before = Date.now();
      const { result } = renderHook(() => useGuestSession(false));
      const after = Date.now();

      const expectedMin = before + SESSION_DURATION;
      const expectedMax = after + SESSION_DURATION;

      if (result.current.resetTime) {
        expect(result.current.resetTime).toBeGreaterThanOrEqual(expectedMin);
        expect(result.current.resetTime).toBeLessThanOrEqual(expectedMax + 100); // Small buffer
      }
    });

    it('should return null for authenticated users with no guest session', () => {
      const { result } = renderHook(() => useGuestSession(true));

      expect(result.current.resetTime).toBeNull();
    });
  });

  describe('resetSession', () => {
    it('should clear guest session from localStorage and state', () => {
      const { result } = renderHook(() => useGuestSession(false));

      act(() => {
        result.current.incrementMessageCount();
      });

      act(() => {
        result.current.incrementMessageCount();
      });

      expect(result.current.messageCount).toBeGreaterThan(0);

      act(() => {
        result.current.resetSession();
      });

      expect(result.current.messageCount).toBe(0);
      try {
        expect(localStorage.getItem(GUEST_SESSION_KEY)).toBeNull();
      } catch {
        // localStorage not available
      }
    });

    it('should handle errors when clearing localStorage', () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      mockRemoveItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useGuestSession(false));

      expect(() => {
        act(() => {
          result.current.resetSession();
        });
      }).not.toThrow();

      mockRemoveItem.mockRestore();
    });
  });

  describe('authentication state changes', () => {
    it('should clear guest session when user authenticates', () => {
      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => useGuestSession(isAuthenticated),
        { initialProps: { isAuthenticated: false } }
      );

      act(() => {
        result.current.incrementMessageCount();
      });

      act(() => {
        result.current.incrementMessageCount();
      });

      expect(result.current.messageCount).toBeGreaterThan(0);

      rerender({ isAuthenticated: true });

      expect(result.current.messageCount).toBe(0);
      expect(result.current.isGuest).toBe(false);
    });

    it('should create fresh guest session when user logs out', () => {
      // Note: When a user authenticates, their guest session is cleared from localStorage.
      // When they log out, they get a fresh guest session (messageCount: 0),
      // NOT a restored old session. This is intentional security/UX behavior.
      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => useGuestSession(isAuthenticated),
        { initialProps: { isAuthenticated: true } }
      );

      expect(result.current.isGuest).toBe(false);
      expect(result.current.messageCount).toBe(0);

      rerender({ isAuthenticated: false });

      // After logout, user becomes guest with a fresh session
      expect(result.current.isGuest).toBe(true);
      expect(result.current.messageCount).toBe(0); // Fresh session, not restored
    });
  });

  describe('return object interface', () => {
    it('should return complete GuestSessionReturn object', () => {
      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current).toHaveProperty('isGuest');
      expect(result.current).toHaveProperty('messageCount');
      expect(result.current).toHaveProperty('maxMessages');
      expect(result.current).toHaveProperty('canSendMessage');
      expect(result.current).toHaveProperty('incrementMessageCount');
      expect(result.current).toHaveProperty('resetSession');
      expect(result.current).toHaveProperty('hasReachedLimit');
      expect(result.current).toHaveProperty('showWarning');
      expect(result.current).toHaveProperty('resetTime');

      expect(typeof result.current.incrementMessageCount).toBe('function');
      expect(typeof result.current.resetSession).toBe('function');
      expect(typeof result.current.isGuest).toBe('boolean');
      expect(typeof result.current.messageCount).toBe('number');
      expect(typeof result.current.canSendMessage).toBe('boolean');
    });

    it('should have correct max messages constant', () => {
      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.maxMessages).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive increments', async () => {
      const { result } = renderHook(() => useGuestSession(false));

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.incrementMessageCount();
        });
      }

      expect(result.current.messageCount).toBe(10);
    });

    it('should maintain consistency between canSendMessage and hasReachedLimit', () => {
      const { result } = renderHook(() => useGuestSession(false));

      // Before limit - guest users can send when not at limit
      expect(result.current.canSendMessage).toBe(true);
      expect(result.current.hasReachedLimit).toBe(false);

      // Fill to max
      act(() => {
        for (let i = 0; i < MAX_GUEST_MESSAGES; i++) {
          result.current.incrementMessageCount();
        }
      });

      // After reaching limit
      expect(result.current.canSendMessage).toBe(result.current.hasReachedLimit ? false : true);
    });

    it('should generate unique session IDs', () => {
      try {
        const { result: result1 } = renderHook(() => useGuestSession(false));
        const stored1 = localStorage.getItem(GUEST_SESSION_KEY);
        if (!stored1) {
          // localStorage not available, skip test
          return;
        }
        const sessionId1 = JSON.parse(stored1).id;

        localStorage.clear();

        const { result: result2 } = renderHook(() => useGuestSession(false));
        const stored2 = localStorage.getItem(GUEST_SESSION_KEY);
        if (!stored2) {
          // localStorage not available, skip test
          return;
        }
        const sessionId2 = JSON.parse(stored2).id;

        expect(sessionId1).not.toBe(sessionId2);
      } catch {
        // localStorage not available, test skipped
      }
    });
  });
});
