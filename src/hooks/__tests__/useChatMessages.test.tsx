/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
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
});
