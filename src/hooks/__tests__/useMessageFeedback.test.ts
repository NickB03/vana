/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMessageFeedback } from '../useMessageFeedback';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useMessageFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitFeedback', () => {
    it('should submit positive feedback successfully', async () => {
      const mockFeedback = {
        id: 'feedback-1',
        message_id: 'msg-1',
        session_id: 'session-1',
        user_id: 'user-1',
        rating: 'positive',
        category: null,
        comment: null,
        created_at: new Date().toISOString(),
      };

      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      // Mock insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockFeedback,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.submitFeedback({
        messageId: 'msg-1',
        sessionId: 'session-1',
        rating: 'positive',
      });

      expect(feedback).toEqual(mockFeedback);
      expect(mockInsert).toHaveBeenCalledWith({
        message_id: 'msg-1',
        session_id: 'session-1',
        user_id: 'user-1',
        rating: 'positive',
        category: null,
        comment: null,
      });
    });

    it('should submit negative feedback with category and comment', async () => {
      const mockFeedback = {
        id: 'feedback-2',
        message_id: 'msg-2',
        session_id: 'session-2',
        user_id: 'user-1',
        rating: 'negative',
        category: 'inaccurate',
        comment: 'Missing context',
        created_at: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockFeedback,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.submitFeedback({
        messageId: 'msg-2',
        sessionId: 'session-2',
        rating: 'negative',
        category: 'inaccurate',
        comment: 'Missing context',
      });

      expect(feedback).toEqual(mockFeedback);
      expect(mockInsert).toHaveBeenCalledWith({
        message_id: 'msg-2',
        session_id: 'session-2',
        user_id: 'user-1',
        rating: 'negative',
        category: 'inaccurate',
        comment: 'Missing context',
      });
    });

    it('should handle guest users (null user_id)', async () => {
      const mockFeedback = {
        id: 'feedback-3',
        message_id: 'msg-3',
        session_id: 'session-3',
        user_id: null,
        rating: 'positive',
        category: null,
        comment: null,
        created_at: new Date().toISOString(),
      };

      // Mock guest user (no auth)
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockFeedback,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.submitFeedback({
        messageId: 'msg-3',
        sessionId: 'session-3',
        rating: 'positive',
      });

      expect(feedback).toEqual(mockFeedback);
      expect(mockInsert).toHaveBeenCalledWith({
        message_id: 'msg-3',
        session_id: 'session-3',
        user_id: null,
        rating: 'positive',
        category: null,
        comment: null,
      });
    });

    it('should handle duplicate feedback error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.submitFeedback({
        messageId: 'msg-1',
        sessionId: 'session-1',
        rating: 'positive',
      });

      expect(feedback).toBeNull();

      await waitFor(() => {
        expect(result.current.error).toBe('You have already submitted feedback for this message');
      });
    });
  });

  describe('getFeedbackForMessage', () => {
    it('should retrieve existing feedback for authenticated user', async () => {
      const mockFeedback = {
        id: 'feedback-1',
        message_id: 'msg-1',
        session_id: 'session-1',
        user_id: 'user-1',
        rating: 'positive',
        category: null,
        comment: null,
        created_at: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockFeedback,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.getFeedbackForMessage('msg-1');

      expect(feedback).toEqual(mockFeedback);
    });

    it('should return null when no feedback exists', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.getFeedbackForMessage('msg-1');

      expect(feedback).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useMessageFeedback());

      const feedback = await result.current.getFeedbackForMessage('msg-1');

      expect(feedback).toBeNull();
    });
  });
});
