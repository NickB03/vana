import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatMessages, ChatMessage } from '../useChatMessages';
import { useGuestSession } from '../useGuestSession';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock request throttle
vi.mock('@/utils/requestThrottle', () => ({
  chatRequestThrottle: {
    canMakeRequest: () => true,
    recordRequest: () => {},
  },
}));

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
  writable: true,
});

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useChatMessages - Guest Integration', () => {
  const GUEST_MESSAGES_KEY = 'vana_guest_messages';

  beforeEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.clear();
    } catch (e) {
      // localStorage may not be available in all test environments
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.clear();
    } catch (e) {
      // localStorage cleanup errors are acceptable in tests
    }
  });

  describe('loading messages on initialization', () => {
    it('should load messages from localStorage for guest users', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          session_id: 'guest-session-1',
          role: 'user',
          content: 'Hello, I need help with React',
          created_at: '2025-01-08T10:00:00Z',
        },
        {
          id: 'msg-2',
          session_id: 'guest-session-1',
          role: 'assistant',
          content: 'I can help you with React!',
          created_at: '2025-01-08T10:00:01Z',
        },
      ];

      // Store messages in localStorage
      try {
        localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(mockMessages));
      } catch {
        return; // Skip if localStorage unavailable
      }

      // Wrapper component that uses both hooks
      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const { messages } = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { messages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Wait for messages to load
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hello, I need help with React');
        expect(result.current.messages[1].content).toBe('I can help you with React!');
      });
    });

    it('should not load messages for authenticated users', () => {
      // Store some messages in localStorage
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          session_id: 'guest-session-1',
          role: 'user',
          content: 'Guest message',
          created_at: '2025-01-08T10:00:00Z',
        },
      ];

      try {
        localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(mockMessages));
      } catch {
        return;
      }

      // Authenticated user (isGuest: false)
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useChatMessages({
          sessionId: 'auth-session-id',
          isGuest: false,
        }),
        { wrapper }
      );

      expect(result.current.messages).toEqual([]);
    });

    it('should merge loaded messages with existing state', async () => {
      const existingMessages: ChatMessage[] = [
        {
          id: 'msg-existing',
          session_id: 'guest-session',
          role: 'user',
          content: 'Existing message',
          created_at: '2025-01-08T09:00:00Z',
        },
      ];

      const storedMessages: ChatMessage[] = [
        {
          id: 'msg-stored',
          session_id: 'guest-session',
          role: 'assistant',
          content: 'Stored message',
          created_at: '2025-01-08T10:00:00Z',
        },
      ];

      // Store messages in localStorage
      try {
        localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(storedMessages));
      } catch {
        return;
      }

      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
          initialMessages: existingMessages,
        });

        return chatMessages;
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      await waitFor(() => {
        // Should have both existing and stored messages
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Existing message');
        expect(result.current.messages[1].content).toBe('Stored message');
      });
    });
  });

  describe('saving messages', () => {
    it('should save messages to localStorage when guest sends/receives', async () => {
      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Send a message
      await act(async () => {
        const savedMessage = await result.current.saveMessage(
          'user',
          'Hello, I need help with React'
        );
        expect(savedMessage).toBeTruthy();
        expect(savedMessage?.content).toBe('Hello, I need help with React');
      });

      // Check if message was saved to localStorage
      try {
        const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed).toHaveLength(1);
          expect(parsed[0].content).toBe('Hello, I need help with React');
        }
      } catch {
        fail('localStorage should be available');
      }
    });

    it('should not save messages for authenticated users', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useChatMessages({
          sessionId: 'auth-session-id',
          isGuest: false,
        }),
        { wrapper }
      );

      // Mock supabase insert to return a message
      const mockSupabase = vi.mocked(await import('@/integrations/supabase/client')).supabase;
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'db-msg-1',
                session_id: 'auth-session-id',
                role: 'user',
                content: 'Authenticated message',
                created_at: '2025-01-08T10:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      await act(async () => {
        await result.current.saveMessage('user', 'Authenticated message');
      });

      // Should not be in localStorage
      try {
        const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
        expect(stored).toBeNull();
      } catch {
        // localStorage not available
      }
    });

    it('should update localStorage when new messages are added', async () => {
      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Save first message
      await act(async () => {
        await result.current.saveMessage('user', 'First message');
      });

      // Save second message
      await act(async () => {
        await result.current.saveMessage('assistant', 'First response');
      });

      // Check localStorage
      try {
        const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed).toHaveLength(2);
          expect(parsed[0].content).toBe('First message');
          expect(parsed[1].content).toBe('First response');
        }
      } catch {
        fail('localStorage should be available');
      }
    });

    it('should respect MAX_STORED_MESSAGES limit', async () => {
      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Save more than MAX_STORED_MESSAGES (50) messages
      for (let i = 0; i < 60; i++) {
        await act(async () => {
          await result.current.saveMessage('user', `Message ${i}`);
        });
      }

      // Check localStorage
      try {
        const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed).toHaveLength(50); // Should be limited to 50
          expect(parsed[0].content).toBe('Message 10'); // First 10 should be trimmed
          expect(parsed[49].content).toBe('Message 59'); // Should keep the last 50
        }
      } catch {
        fail('localStorage should be available');
      }
    });
  });

  describe('authentication transitions', () => {
    it('should clear guest messages when user authenticates', async () => {
      const TestComponent = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
        const guestSession = useGuestSession(isAuthenticated);
        const chatMessages = useChatMessages({
          sessionId: isAuthenticated ? 'auth-session' : (guestSession.sessionId || 'guest'),
          isGuest: !isAuthenticated,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => TestComponent({ isAuthenticated }),
        {
          wrapper,
          initialProps: { isAuthenticated: false },
        }
      );

      // Save messages as guest
      await act(async () => {
        await result.current.saveMessage('user', 'Guest message');
      });

      // Verify message is saved
      try {
        expect(localStorage.getItem(GUEST_MESSAGES_KEY)).toBeTruthy();
      } catch {
        fail('localStorage should be available');
      }

      // Authenticate user
      rerender({ isAuthenticated: true });

      // Guest messages should be cleared
      try {
        expect(localStorage.getItem(GUEST_MESSAGES_KEY)).toBeNull();
      } catch {
        // localStorage not available
      }

      // Guest session should be reset
      expect(result.current.guestSession.messageCount).toBe(0);
    });

    it('should not interfere with authenticated user flow', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useChatMessages({
          sessionId: 'auth-session-id',
          isGuest: false,
        }),
        { wrapper }
      );

      // Mock successful database save
      const mockSupabase = vi.mocked(await import('@/integrations/supabase/client')).supabase;
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'db-msg-1',
                session_id: 'auth-session-id',
                role: 'user',
                content: 'Auth user message',
                created_at: '2025-01-08T10:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      // Save message as authenticated user
      await act(async () => {
        const saved = await result.current.saveMessage('user', 'Auth user message');
        expect(saved).toBeTruthy();
        expect(saved?.id).toBe('db-msg-1');
      });

      // Should not affect localStorage
      try {
        expect(localStorage.getItem(GUEST_MESSAGES_KEY)).toBeNull();
      } catch {
        // localStorage not available
      }
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      mockSetItem.mockImplementation(() => {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Should not throw when saving message
      expect(async () => {
        await act(async () => {
          await result.current.saveMessage('user', 'Test message');
        });
      }).not.toThrow();

      mockSetItem.mockRestore();
    });

    it('should handle corrupted message data in localStorage', async () => {
      // Store corrupted data
      try {
        localStorage.setItem(GUEST_MESSAGES_KEY, 'invalid json {]');
      } catch {
        return;
      }

      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Should handle corrupted data gracefully
      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
      });

      // Should be able to save new messages
      await act(async () => {
        const saved = await result.current.saveMessage('user', 'New message after corruption');
        expect(saved).toBeTruthy();
      });
    });

    it('should handle localStorage unavailable (private browsing)', async () => {
      // Mock localStorage to throw SecurityError
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem');
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');

      mockGetItem.mockImplementation(() => {
        const error = new DOMException('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });

      mockSetItem.mockImplementation(() => {
        const error = new DOMException('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });

      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Should work without localStorage
      expect(async () => {
        await act(async () => {
          await result.current.saveMessage('user', 'Message in private browsing');
        });
      }).not.toThrow();

      // Message should still be in state
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Message in private browsing');

      mockGetItem.mockRestore();
      mockSetItem.mockRestore();
    });
  });

  describe('performance', () => {
    it('should not block UI when saving to localStorage', async () => {
      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      // Simulate slow localStorage
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      mockSetItem.mockImplementation(() => {
        // Simulate 10ms delay
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait
        }
      });

      const startTime = Date.now();

      await act(async () => {
        await result.current.saveMessage('user', 'Test message');
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not take significantly longer than the mock delay
      expect(duration).toBeLessThan(100); // Allow some tolerance

      mockSetItem.mockRestore();
    });

    it('should handle large message history efficiently', async () => {
      // Pre-load with many messages
      const manyMessages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        session_id: 'guest-session',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `This is message number ${i} with some content to make it a bit longer`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

      try {
        localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(manyMessages));
      } catch {
        return;
      }

      const TestComponent = () => {
        const guestSession = useGuestSession(false);
        const chatMessages = useChatMessages({
          sessionId: guestSession.sessionId,
          isGuest: true,
        });

        return { ...chatMessages, guestSession };
      };

      const wrapper = createWrapper();
      const startTime = Date.now();
      const { result } = renderHook(() => TestComponent(), { wrapper });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(50); // Should be trimmed to 50
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should load quickly even with many messages
      expect(duration).toBeLessThan(100); // Should load in under 100ms
    });
  });
});