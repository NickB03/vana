/**
 * Message handling logic for chat streaming
 */

import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ResearchRequest } from '../../lib/api/types';
import { apiClient } from '../../lib/api/client';
import { useChatStore } from './store';
import { ChatSession } from './types';
import { SSEHookReturn } from '../useSSE';
import {
  ensureSSEReady,
  waitForSSEConnection,
  SSEMessageQueue
} from './sse-connection-helpers';

interface MessageHandlerParams {
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  researchSSE?: SSEHookReturn;
  agentSSE?: SSEHookReturn;
}

/**
 * Hook for message handling operations
 */
export function useMessageHandlers({
  currentSessionId,
  currentSession,
  setIsStreaming,
  setError,
  researchSSE,
  agentSSE,
}: MessageHandlerParams) {
  const addMessageInStore = useChatStore(state => state.addMessage);
  const updateSessionMetaInStore = useChatStore(state => state.updateSessionMeta);
  const setSessionStreamingInStore = useChatStore(state => state.setSessionStreaming);
  const setSessionErrorInStore = useChatStore(state => state.setSessionError);
  const updateStreamingMessageInStore = useChatStore(state => state.updateStreamingMessage);
  const completeStreamingMessageInStore = useChatStore(state => state.completeStreamingMessage);

  // P0-001 FIX: Message queue to prevent SSE race conditions
  // This ensures sequential processing of rapid messages
  const messageQueueRef = useRef(new SSEMessageQueue());

  /**
   * Sends a message and initiates research
   */
  const sendMessage = useCallback(async (content: string) => {
    // Get the latest currentSessionId from the store instead of closure
    // This ensures we use the correct session even if called immediately after switchSession
    const activeSessionId = useChatStore.getState().currentSessionId;

    if (!activeSessionId || !content.trim()) return;

    setError(null);

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${uuidv4()}_user`,
        content: content.trim(),
        role: 'user',
        timestamp: new Date().toISOString(),
        sessionId: activeSessionId,
      };

      addMessageInStore(activeSessionId, userMessage);

      // Add initial assistant message for streaming
      const assistantMessageId = `msg_${uuidv4()}_assistant`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: 'Thinking...',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: activeSessionId,
        metadata: { kind: 'assistant-progress' },
      };

      addMessageInStore(activeSessionId, assistantMessage);
      updateSessionMetaInStore(activeSessionId, {
        title: currentSession?.title ?? userMessage.content.slice(0, 60),
        status: 'running',
      });
      setSessionStreamingInStore(activeSessionId, true);
      setIsStreaming(true);
      setSessionErrorInStore(activeSessionId, null);

      // Start research via API
      const researchRequest: ResearchRequest = {
        query: content,
        message: content,
      };

      // Skip authentication check in development mode to allow testing
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (!isDevelopment && !apiClient.isAuthenticated()) {
        // Fallback to local response when not authenticated
        setTimeout(() => {
          updateStreamingMessageInStore(
            activeSessionId,
            assistantMessageId,
            `I received your request: "${content}". Connect your Vana backend to stream live multi-agent research results.`
          );
          completeStreamingMessageInStore(activeSessionId, assistantMessageId);
          setSessionStreamingInStore(activeSessionId, false);
          setIsStreaming(false);
        }, 600);
        return;
      }

      // Note: We don't need to call appendSessionMessage here because:
      // 1. The session doesn't exist on the backend yet (created by startResearch)
      // 2. startResearch handles message persistence
      // 3. This was causing timeouts for new sessions

      // P0-001 FIX: Proper SSE connection state management
      // Use message queue to prevent race conditions when sending rapid sequential messages
      await messageQueueRef.current.enqueue(async () => {
        console.log('[MessageHandler] Starting SSE connection sequence');

        try {
          // Step 1: Ensure clean disconnection of existing SSE (max 5 seconds)
          await ensureSSEReady(researchSSE, 5000);

          // Step 2: Start research via API
          const response = await apiClient.startResearch(activeSessionId, researchRequest);

          console.log('[MessageHandler] Research API response:', {
            sessionId: activeSessionId,
            success: response.success,
            message: response.message,
          });

          if (!response.success) {
            throw new Error(response.message || 'Failed to start research');
          }

          // Step 3: Explicitly connect SSE for the new research session
          if (!researchSSE?.isConnected) {
            console.log('[MessageHandler] Initiating SSE connection for new research');
            researchSSE?.connect();
          }

          // Step 4: Wait for SSE connection to be established (max 5 seconds)
          await waitForSSEConnection(researchSSE, 5000);

          console.log('[MessageHandler] SSE connection sequence completed successfully');
          console.log('[MessageHandler] SSE connection status:', {
            research: researchSSE?.isConnected,
            agent: agentSSE?.isConnected
          });
        } catch (error) {
          console.error('[MessageHandler] SSE connection sequence failed:', error);
          throw error; // Re-throw to be caught by outer error handler
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsStreaming(false);
      setSessionErrorInStore(activeSessionId, errorMessage);

      // Add error message
      const errorMsg: ChatMessage = {
        id: `msg_${uuidv4()}_error`,
        content: `Error: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: activeSessionId,
      };

      addMessageInStore(activeSessionId, errorMsg);
      setSessionStreamingInStore(activeSessionId, false);
    }
  }, [
    currentSessionId,
    currentSession?.title,
    addMessageInStore,
    setSessionStreamingInStore,
    setSessionErrorInStore,
    updateSessionMetaInStore,
    updateStreamingMessageInStore,
    completeStreamingMessageInStore,
    setIsStreaming,
    setError,
    researchSSE,
    agentSSE,
  ]);

  /**
   * Retries the last user message
   */
  const retryLastMessage = useCallback(async () => {
    if (!currentSession) return;

    const lastUserMessage = [...currentSession.messages]
      .reverse()
      .find(msg => msg.role === 'user');

    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content);
    }
  }, [currentSession, sendMessage]);

  return {
    sendMessage,
    retryLastMessage,
  };
}
