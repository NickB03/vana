/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnValue({ data: [], error: null }),
  upsert: vi.fn().mockReturnThis(),
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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/utils/requestThrottle', () => ({
  chatRequestThrottle: {
    waitForToken: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/utils/authHelpers', () => ({
  getAuthErrorMessage: vi.fn((error: any) => error?.message || 'Unknown error'),
}));

vi.mock('@/types/reasoning', () => ({
  parseReasoningSteps: vi.fn((steps) => steps),
}));

const originalFetch = global.fetch;

const createMockReader = (chunks: string[]) => {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const value = encoder.encode(chunks[index]);
      index += 1;
      return { done: false, value };
    },
  };
};

const createStreamResponse = (chunks: string[]) => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  body: {
    getReader: () => createMockReader(chunks),
  },
});

const sseLine = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

describe('useChatMessages - streaming message stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!global.crypto?.randomUUID) {
      let counter = 0;
      Object.defineProperty(global, 'crypto', {
        value: {
          randomUUID: () => `test-uuid-${counter++}`,
        },
        writable: true,
      });
    }
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error - remove test stub
      delete global.fetch;
    }
  });

  it('keeps a single assistant message id across streaming and final save', async () => {
    const { result } = renderHook(() => useChatMessages(undefined, { isGuest: true }));

    const assistantMessageId = 'assistant-stream-1';
    const chunks = [
      sseLine({ candidates: [{ content: { parts: [{ text: 'Hello ' }] } }] }),
      sseLine({ candidates: [{ content: { parts: [{ text: 'world' }] } }] }),
      'data: [DONE]\n\n',
    ];

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse(chunks));
    global.fetch = fetchMock as any;

    const onDelta = vi.fn();
    const onDone = vi.fn();

    await act(async () => {
      await result.current.streamChat(
        'Hi',
        onDelta,
        onDone,
        undefined,
        'auto',
        'auto',
        0,
        undefined,
        assistantMessageId
      );
    });

    await waitFor(() => {
      const assistantMessages = result.current.messages.filter((msg) => msg.role === 'assistant');
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].id).toBe(assistantMessageId);
      expect(assistantMessages[0].content).toBe('Hello world');
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
