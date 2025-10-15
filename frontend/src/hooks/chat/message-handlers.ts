/**
 * Message handling logic for chat streaming
 */

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ResearchRequest } from '../../lib/api/types';
import { apiClient } from '../../lib/api/client';
import { useChatStore } from './store';
import { ChatSession } from './types';
import { SSEHookReturn } from '../useSSE';
import { waitForSSEConnection } from './sse-connection-helpers';

interface MessageHandlerParams {
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  researchSSE?: { connect: () => void; isConnected: boolean };
  agentSSE?: { connect: () => void; isConnected: boolean };
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
      // RACE CONDITION FIX: Ensure SSE connection is established BEFORE starting research
      // This prevents events from being broadcast to 0 subscribers
      if (researchSSE && !researchSSE.isConnected) {
        console.log('[MessageHandler] SSE not connected, establishing connection before research');
        researchSSE.connect();

        try {
          // Wait up to 5 seconds for SSE connection to establish
          await waitForSSEConnection(researchSSE, 5000);
          console.log('[MessageHandler] SSE connection established, proceeding with research');
        } catch (connectionError) {
          const errorMsg = connectionError instanceof Error
            ? connectionError.message
            : 'Failed to establish SSE connection';
          console.error('[MessageHandler] SSE connection failed:', errorMsg);
          throw new Error(`Could not connect to server: ${errorMsg}`);
        }
      } else if (researchSSE) {
        console.log('[MessageHandler] SSE already connected, proceeding with research');
      }

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
        content: 'Initializing research pipeline...',
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

      // Start research via API
      // CRITICAL: SSE connection stays open for the entire session (per Multi_agent_chat_requiremenst.md)
      // Events flow continuously through the queue - DO NOT disconnect/reconnect
      // SSE connection is now guaranteed to be established before this call
      const response = await apiClient.startResearch(activeSessionId, researchRequest);

      console.log('[MessageHandler] Research API response:', {
        sessionId: activeSessionId,
        success: response.success,
        message: response.message,
        researchSSEConnected: researchSSE?.isConnected,
        agentSSEConnected: agentSSE?.isConnected
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to start research');
      }

      // SSE connection management is handled by useSSE hook
      // Events (research_update, agent_status, research_complete) will be
      // received and processed by sse-event-handlers automatically
      console.log('[MessageHandler] Research started, SSE events will flow automatically');

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
