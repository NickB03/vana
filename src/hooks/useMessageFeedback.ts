import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type FeedbackRating = 'positive' | 'negative';
export type FeedbackCategory = 'inaccurate' | 'unhelpful' | 'incomplete' | 'off_topic';

export interface FeedbackData {
  messageId: string;
  sessionId: string;
  rating: FeedbackRating;
  category?: FeedbackCategory;
  comment?: string;
}

export interface MessageFeedback {
  id: string;
  message_id: string;
  session_id: string;
  user_id: string | null;
  rating: FeedbackRating;
  category: FeedbackCategory | null;
  comment: string | null;
  created_at: string;
}

/**
 * Hook for submitting and retrieving user feedback on AI messages
 *
 * Features:
 * - Submit thumbs up/down ratings
 * - Optional categories for negative feedback
 * - Optional text comments
 * - Check existing feedback to prevent duplicates
 *
 * @example
 * const { submitFeedback, getFeedbackForMessage, isLoading } = useMessageFeedback();
 *
 * // Submit positive feedback
 * await submitFeedback({
 *   messageId: 'msg-123',
 *   sessionId: 'session-456',
 *   rating: 'positive'
 * });
 *
 * // Submit negative feedback with category
 * await submitFeedback({
 *   messageId: 'msg-123',
 *   sessionId: 'session-456',
 *   rating: 'negative',
 *   category: 'incomplete',
 *   comment: 'Missing code examples'
 * });
 */
export function useMessageFeedback() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Submit user feedback for a message
   */
  const submitFeedback = useCallback(async (data: FeedbackData): Promise<MessageFeedback | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user (null for guests)
      const { data: { user } } = await supabase.auth.getUser();

      // Insert feedback
      const { data: feedback, error: insertError } = await supabase
        .from('message_feedback')
        .insert({
          message_id: data.messageId,
          session_id: data.sessionId,
          user_id: user?.id || null,
          rating: data.rating,
          category: data.category || null,
          comment: data.comment || null,
        })
        .select()
        .single();

      if (insertError) {
        // Handle duplicate feedback (user already submitted)
        if (insertError.code === '23505') {
          throw new Error('You have already submitted feedback for this message');
        }
        throw insertError;
      }

      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!"
      });

      return feedback as MessageFeedback;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);

      toast({
        title: "Failed to submit feedback",
        description: errorMessage,
        variant: "destructive"
      });

      console.error("Error submitting feedback:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Get existing feedback for a message (if user already submitted)
   */
  const getFeedbackForMessage = useCallback(async (messageId: string): Promise<MessageFeedback | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user?.id || null)
        .maybeSingle();

      if (error) throw error;

      return data as MessageFeedback | null;
    } catch (err) {
      console.error("Error fetching feedback:", err);
      return null;
    }
  }, []);

  return {
    submitFeedback,
    getFeedbackForMessage,
    isLoading,
    error
  };
}
