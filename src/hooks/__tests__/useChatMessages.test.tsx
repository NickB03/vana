/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
// Mock Supabase client integration
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnValue({ data: [], error: null }),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnValue({ data: {}, error: null }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

// Mock useToast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock request throttle
vi.mock('@/utils/requestThrottle', () => ({
  chatRequestThrottle: {
    waitForToken: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock authHelpers
vi.mock('@/utils/authHelpers', () => ({
  ensureValidSession: vi.fn().mockResolvedValue(null),
  getAuthErrorMessage: vi.fn((error: any) => error?.message || 'Unknown error'),
}));

// Mock reasoning parser
vi.mock('@/types/reasoning', () => ({
  parseReasoningSteps: vi.fn((steps) => steps),
}));

describe('useChatMessages', () => {
  const mockSessionId = 'test-session-id';
  let useChatMessages: any;

  beforeAll(async () => {
    // Dynamic import to ensure mocks are applied before module loading
    // This prevents eager loading of heavy dependencies (Sentry, etc.) that cause OOM
    const mod = await import('../useChatMessages');
    useChatMessages = mod.useChatMessages;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty messages', () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return empty messages when sessionId is undefined', () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      expect(result.current.messages).toEqual([]);
    });

    it('should have required methods available', () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      expect(typeof result.current.streamChat).toBe('function');
      expect(typeof result.current.saveMessage).toBe('function');
      expect(typeof result.current.deleteMessage).toBe('function');
      expect(typeof result.current.updateMessage).toBe('function');
    });
  });

  describe('saveMessage', () => {
    it('should save guest message to local state when no sessionId', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', 'Test message');
      });

      expect(savedMessage).toBeDefined();
      expect(savedMessage?.content).toBe('Test message');
      expect(savedMessage?.role).toBe('user');
      expect(savedMessage?.session_id).toBe('guest');
      expect(result.current.messages).toContainEqual(savedMessage);
    });

    it('should save guest message with reasoning steps', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      const mockReasoningSteps = {
        steps: [{ step: 1, title: 'Test', content: 'Testing' }],
      };

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          mockReasoningSteps
        );
      });

      expect(savedMessage?.reasoning_steps).toEqual(mockReasoningSteps);
    });

    it('should save guest message with search results', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      const mockSearchResults = {
        query: 'test',
        sources: [{ title: 'Source', url: 'http://test.com' }],
      };

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          'Response with search',
          undefined,
          undefined,
          mockSearchResults
        );
      });

      expect(savedMessage?.search_results).toEqual(mockSearchResults);
    });
  });

  describe('deleteMessage', () => {
    it('should delete guest message from local state', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', 'Test');
      });

      expect(result.current.messages).toHaveLength(1);

      if (savedMessage) {
        await act(async () => {
          await result.current.deleteMessage(savedMessage.id);
        });

        expect(result.current.messages).toHaveLength(0);
      }
    });
  });

  describe('updateMessage', () => {
    it('should update guest message in local state', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', 'Original');
      });

      if (savedMessage) {
        await act(async () => {
          await result.current.updateMessage(savedMessage.id, 'Updated');
        });

        expect(result.current.messages[0].content).toBe('Updated');
      }
    });
  });

  describe('return object', () => {
    it('should return proper interface', () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      expect(result.current).toHaveProperty('messages');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('streamChat');
      expect(result.current).toHaveProperty('saveMessage');
      expect(result.current).toHaveProperty('deleteMessage');
      expect(result.current).toHaveProperty('updateMessage');

      expect(Array.isArray(result.current.messages)).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.streamChat).toBe('function');
      expect(typeof result.current.saveMessage).toBe('function');
      expect(typeof result.current.deleteMessage).toBe('function');
      expect(typeof result.current.updateMessage).toBe('function');
    });
  });

  describe('multi-message flow', () => {
    it('should handle multiple message operations', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      const messages = [];

      // Add multiple messages
      for (let i = 0; i < 3; i++) {
        let msg;
        await act(async () => {
          msg = await result.current.saveMessage('user', `Message ${i + 1}`);
        });
        if (msg) messages.push(msg);
      }

      expect(result.current.messages).toHaveLength(3);

      // Delete middle message
      if (messages[1]) {
        await act(async () => {
          await result.current.deleteMessage(messages[1].id);
        });

        expect(result.current.messages).toHaveLength(2);
      }

      // Update remaining message
      if (messages[0]) {
        await act(async () => {
          await result.current.updateMessage(messages[0].id, 'Updated Message 1');
        });

        expect(result.current.messages[0].content).toBe('Updated Message 1');
      }
    });
  });

  // ============================================================================
  // ERROR HANDLING / NEGATIVE TEST CASES
  // ============================================================================
  // These tests verify the hook handles failures gracefully and doesn't silently
  // swallow errors that could leave the UI in an inconsistent state.
  // ============================================================================

  describe('error handling - invalid data', () => {
    it('should handle null reasoning steps gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          null as any // Explicitly null reasoning steps
        );
      });

      expect(savedMessage).toBeDefined();
      expect(savedMessage?.reasoning_steps).toBeNull();
    });

    it('should handle empty string content', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', '');
      });

      // Empty content is technically valid - up to business logic to reject
      expect(savedMessage).toBeDefined();
      expect(savedMessage?.content).toBe('');
    });
  });

  describe('error handling - deleteMessage edge cases', () => {
    it('should handle deleting non-existent message ID gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      // Save a real message first
      await act(async () => {
        await result.current.saveMessage('user', 'Real message');
      });

      expect(result.current.messages).toHaveLength(1);

      // Try to delete a message that doesn't exist
      await act(async () => {
        await result.current.deleteMessage('non-existent-uuid-12345');
      });

      // Original message should still be there
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Real message');
    });
  });

  describe('error handling - updateMessage edge cases', () => {
    it('should handle updating non-existent message ID gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      // Save a real message first
      await act(async () => {
        await result.current.saveMessage('user', 'Original');
      });

      const originalContent = result.current.messages[0].content;

      // Try to update a message that doesn't exist
      await act(async () => {
        await result.current.updateMessage('non-existent-uuid-12345', 'Updated');
      });

      // Original message should be unchanged
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe(originalContent);
    });
  });

  describe('error handling - guest session persistence', () => {
    it('should handle localStorage save failure gracefully', async () => {
      const mockSaveMessages = vi.fn().mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const { result } = renderHook(() =>
        useChatMessages(undefined, {
          isGuest: true,
          guestSession: {
            saveMessages: mockSaveMessages,
            loadMessages: () => [],
            clearMessages: vi.fn(),
          },
        })
      );

      // Should not throw even though localStorage fails
      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', 'Test message');
      });

      // Message should still be saved to local state
      expect(savedMessage).toBeDefined();
      expect(result.current.messages).toHaveLength(1);

      // But saveMessages was attempted
      expect(mockSaveMessages).toHaveBeenCalled();
    });
  });

  describe('edge cases - special characters', () => {
    it('should handle messages with special characters', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      const specialContent = '<script>alert("xss")</script> & "quotes" \'apostrophe\'';

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', specialContent);
      });

      // Content should be preserved exactly as-is (sanitization is done at render)
      expect(savedMessage?.content).toBe(specialContent);
    });

    it('should handle very long messages', async () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      const longContent = 'A'.repeat(10000); // 10KB message

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage('user', longContent);
      });

      expect(savedMessage?.content).toBe(longContent);
      expect(savedMessage?.content.length).toBe(10000);
    });
  });

  describe('artifact render timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('marks artifact as rendered after timeout when idle', () => {
      const { result } = renderHook(() => useChatMessages(undefined));

      expect(result.current.artifactRenderStatus).toBe('pending');

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.artifactRenderStatus).toBe('rendered');
    });
  });
});
