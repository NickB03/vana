/**
 * SSE event handling for research and agent updates
 */

import { useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ResearchProgress } from '../../lib/api/types';
import { useChatStore } from './store';
import { ChatSession, StableResearchEvent, StableAgentEvent } from './types';
import { extractContentFromADKEvent, hasExtractableContent } from './adk-content-extraction';

interface SSEEventHandlerParams {
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  researchSSE: any;
  agentSSE: any;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook for processing SSE events
 */
export function useSSEEventHandlers({
  currentSessionId,
  currentSession,
  researchSSE,
  agentSSE,
  setIsStreaming,
  setError,
}: SSEEventHandlerParams) {
  // P1-005 FIX: Track mount status to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addMessageInStore = useChatStore(state => state.addMessage);
  const updateProgressInStore = useChatStore(state => state.updateProgress);
  const updateSessionMetaInStore = useChatStore(state => state.updateSessionMeta);
  const updateStreamingMessageInStore = useChatStore(state => state.updateStreamingMessage);
  const completeStreamingMessageInStore = useChatStore(state => state.completeStreamingMessage);
  const setSessionStreamingInStore = useChatStore(state => state.setSessionStreaming);
  const updateAgentsInStore = useChatStore(state => state.updateAgents);
  const updateMessageInStore = useChatStore(state => state.updateMessage);
  const deleteMessageAndSubsequentInStore = useChatStore(state => state.deleteMessageAndSubsequent);
  const updateFeedbackInStore = useChatStore(state => state.updateFeedback);
  const updateThoughtProcessInStore = useChatStore(state => state.updateThoughtProcess);

  // Memoize stable event data to prevent infinite loops
  const stableResearchEvent = useMemo(() => {
    if (!researchSSE.lastEvent || !currentSessionId) return null;

    try {
      const { type, data } = researchSSE.lastEvent;

      // Defensive null checking
      if (!type) return null;

      const payload = (data ?? {}) as Record<string, any>;

      console.log('[sse-event-handlers] stableResearchEvent memo triggered:', {
        type,
        invocationId: data?.invocationId,
        hasContent: !!data?.content,
        hasUsageMetadata: !!data?.usageMetadata,
        isPartial: data?.partial,
      });

      return {
        type,
        payload,
        timestamp: data?.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Error processing SSE research event:', error);
      return null;
    }
  }, [
    researchSSE.lastEvent?.type,
    researchSSE.lastEvent?.data?.invocationId,  // FIX: Unique per ADK event
    researchSSE.lastEvent?.data?.timestamp,
    researchSSE.lastEvent?.data?.current_phase,
    researchSSE.lastEvent?.data?.overall_progress,
    researchSSE.lastEvent?.data?.status,
    // Monitor content reference changes without expensive serialization
    researchSSE.lastEvent?.data?.content,
    currentSessionId,
  ]);

  // Memoize stable agent event data to prevent infinite loops
  const stableAgentEvent = useMemo(() => {
    if (!agentSSE.lastEvent || !currentSessionId) return null;
    
    try {
      const event = agentSSE.lastEvent;
      
      // Defensive checks for event structure
      if (!event.type || !event.data) return null;
      
      // Process relevant agent events with proper data structure
      if (event.type === 'agent_network_update' && Array.isArray(event.data.agents)) {
        return {
          type: event.type,
          agents: event.data.agents,
          timestamp: event.data.timestamp || new Date().toISOString(),
        };
      }

      // Process chat action events that might come through agent SSE
      if (['message_edited', 'message_deleted', 'feedback_received', 'regeneration_progress'].includes(event.type)) {
        return {
          type: event.type,
          payload: event.data,
          timestamp: event.data.timestamp || new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('Error processing SSE agent event:', error);
    }
    
    return null;
  }, [
    agentSSE.lastEvent?.type,
    agentSSE.lastEvent?.data?.timestamp,
    // PERFORMANCE FIX: Use array length and first agent ID instead of JSON.stringify
    // JSON.stringify is expensive and defeats memoization - use stable primitive values
    agentSSE.lastEvent?.data?.agents?.length,
    agentSSE.lastEvent?.data?.agents?.[0]?.agent_id,
    agentSSE.lastEvent?.data?.messageId, // For message action events
    agentSSE.lastEvent?.data?.newContent, // For message edit events
    agentSSE.lastEvent?.data?.feedback, // For feedback events
    agentSSE.lastEvent?.data?.thoughtProcess, // For regeneration events
    agentSSE.lastEvent?.data?.regenerationStep, // For regeneration events
    currentSessionId,
  ]);

  /**
   * Creates a progress message if it doesn't exist
   * FIX: Now creates unique progress message per ADK invocation to prevent corruption
   * Each distinct ADK agent response gets its own message (prevents overwriting)
   */
  const ensureProgressMessage = (invocationId?: string) => {
    if (!currentSessionId || !currentSession) return null;

    const inReplyToMessageId = currentSession.metadata?.lastUserMessageId;

    // FIX: Find progress message for THIS specific invocation (if provided)
    // This prevents multiple agent responses from overwriting the same message
    if (invocationId) {
      const invocationMessage = currentSession.messages.find(
        msg => msg.role === 'assistant'
          && msg.metadata?.invocationId === invocationId
          && !msg.metadata?.completed
      );

      if (invocationMessage) {
        console.log('[ensureProgressMessage] Found existing message for invocation:', invocationId, 'message:', invocationMessage.id);
        return invocationMessage.id;
      }
    }

    // No invocationId or no existing message - find any incomplete message for this user message
    // This handles legacy events without invocationId
    const progressMessage = currentSession.messages.find(
      msg => msg.role === 'assistant'
        && msg.metadata?.kind === 'assistant-progress'
        && msg.metadata?.inReplyTo === inReplyToMessageId
        && !msg.metadata?.completed
        && !msg.metadata?.invocationId  // Only match messages without invocationId (legacy)
    );

    if (progressMessage) {
      console.log('[ensureProgressMessage] Found existing progress message:', progressMessage.id, 'for user message:', inReplyToMessageId);
      return progressMessage.id;
    }

    // Create new message with invocationId tracking
    const messageId = `msg_${uuidv4()}_assistant_progress`;
    const placeholder: ChatMessage = {
      id: messageId,
      content: 'Thinking...',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId,
      metadata: {
        kind: 'assistant-progress',
        inReplyTo: inReplyToMessageId,  // Link to user message
        invocationId: invocationId,     // Track ADK invocation
        completed: false,
      },
    };
    console.log('[ensureProgressMessage] Created new progress message:', messageId, 'invocation:', invocationId, 'for user message:', inReplyToMessageId);
    addMessageInStore(currentSessionId, placeholder);
    return messageId;
  };

  /**
   * Formats progress content for display
   */
  const formatProgressContent = (payload: any) => {
    const phase = payload.current_phase ?? currentSession?.progress?.current_phase ?? 'Processing';
    const progressValue = typeof payload.overall_progress === 'number'
      ? Math.round((payload.overall_progress <= 1 ? payload.overall_progress * 100 : payload.overall_progress))
      : undefined;

    const lines: string[] = [`**${phase}**`];
    if (typeof progressValue === 'number') {
      lines.push(`Progress: ${Math.min(100, Math.max(0, progressValue))}%`);
    }

    if (payload && typeof payload.partial_results === 'object' && payload.partial_results !== null) {
      const previewEntries = Object.entries(payload.partial_results).slice(0, 2);
      if (previewEntries.length > 0) {
        lines.push(
          previewEntries
            .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
            .join('\n')
        );
      }
    }

    return lines.join('\n\n');
  };

  /**
   * Merges progress with existing state
   */
  const mergeProgressSnapshot = (overrides: Partial<ResearchProgress>) => {
    if (!currentSessionId || !currentSession) return;

    const previous = currentSession.progress;
    const progress: ResearchProgress = {
      session_id: currentSessionId,
      status: overrides.status ?? previous?.status ?? 'running',
      overall_progress: overrides.overall_progress ?? previous?.overall_progress ?? 0,
      current_phase: overrides.current_phase ?? previous?.current_phase ?? 'Processing',
      agents: overrides.agents ?? previous?.agents ?? [],
      partial_results: overrides.partial_results ?? previous?.partial_results,
      final_report: overrides.final_report ?? previous?.final_report,
      error: overrides.error ?? previous?.error,
      started_at: previous?.started_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    updateProgressInStore(currentSessionId, progress);
    updateSessionMetaInStore(currentSessionId, {
      status: progress.status,
      current_phase: progress.current_phase,
      overallProgress: progress.overall_progress,
      final_report: progress.final_report ?? currentSession.final_report ?? null,
      error: progress.error ?? currentSession.error ?? null,
    });
  };

  // Handle SSE events for research progress
  useEffect(() => {
    // P1-005 FIX: Check if component is still mounted before processing
    if (!mountedRef.current || !stableResearchEvent || !currentSessionId) return;

    const { type, payload } = stableResearchEvent;
    const session = currentSession;
    if (!session) return;

    console.log('[sse-event-handlers] Processing event in effect:', {
      type,
      invocationId: payload?.invocationId,
      hasUsageMetadata: !!payload?.usageMetadata,
      isPartial: payload?.partial,
    });

    switch (type) {
      case 'research_started': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const invocationId = payload?.invocationId;
        const messageId = ensureProgressMessage(invocationId);
        if (messageId && mountedRef.current) {
          updateStreamingMessageInStore(
            currentSessionId,
            messageId,
            'Research session acknowledged. Coordinating agent network...'
          );
        }
        if (mountedRef.current) {
          setSessionStreamingInStore(currentSessionId, true);
        }
        break;
      }
      case 'research_update':
      case 'research_progress': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const invocationId = payload?.invocationId;
        const messageId = ensureProgressMessage(invocationId);
        if (messageId && mountedRef.current) {
          // For research_update, extract content using ADK extraction (handles parts[])
          // For research_progress, format progress data
          const content = type === 'research_update'
            ? extractContentFromADKEvent(payload, formatProgressContent(payload)).content
            : formatProgressContent(payload);
          updateStreamingMessageInStore(currentSessionId, messageId, content);
        }

        if (mountedRef.current) {
          mergeProgressSnapshot({
            status: payload.status ?? 'running',
            overall_progress: typeof payload.overall_progress === 'number'
              ? (payload.overall_progress <= 1 ? payload.overall_progress : payload.overall_progress / 100)
              : undefined,
            current_phase: payload.current_phase,
            partial_results: payload.partial_results,
            agents: Array.isArray(payload.agents) ? payload.agents : undefined,
          });
        }

        if (mountedRef.current) {
          setSessionStreamingInStore(currentSessionId, true);
        }
        break;
      }
      case 'research_complete': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const invocationId = payload?.invocationId;
        const messageId = ensureProgressMessage(invocationId);

        // CRITICAL FIX P0-002: Extract content from ADK event using proper extraction
        // that handles top-level fields, parts[].text, AND parts[].functionResponse
        // Research plans from plan_generator come via functionResponse, not top-level fields!
        const extractionResult = extractContentFromADKEvent(
          payload,
          currentSession?.messages.find(msg => msg.id === messageId)?.content ||
          'Research complete. (No report returned)'
        );

        const finalContent = extractionResult.content;

        console.log('[P0-002] research_complete extraction:', {
          messageId,
          invocationId,
          contentLength: finalContent?.length,
          sources: extractionResult.sources,
          storeMessagesCount: currentSession?.messages?.length,
        });

        if (messageId && mountedRef.current) {
          // Update message with final content from payload
          updateStreamingMessageInStore(currentSessionId, messageId, finalContent);
          // Mark the message as completed
          completeStreamingMessageInStore(currentSessionId, messageId);
        }

        if (mountedRef.current) {
          setSessionStreamingInStore(currentSessionId, false);
          mergeProgressSnapshot({
            status: 'completed',
            overall_progress: 1,
            current_phase: payload.current_phase ?? 'Research complete',
            final_report: finalContent,
          });
          setIsStreaming(false);
        }
        break;
      }
      case 'error': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const invocationId = payload?.invocationId;
        const messageId = ensureProgressMessage(invocationId);
        const message = payload.message || payload.error || 'An error occurred during research.';
        if (messageId && mountedRef.current) {
          updateStreamingMessageInStore(currentSessionId, messageId, `Error: ${message}`);
          completeStreamingMessageInStore(currentSessionId, messageId);
        }
        if (mountedRef.current) {
          setSessionStreamingInStore(currentSessionId, false);
          mergeProgressSnapshot({ status: 'error', error: message });
          setError(message);
          setIsStreaming(false);
        }
        break;
      }
      case 'connection': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        if (payload.status === 'disconnected') {
          setSessionStreamingInStore(currentSessionId, false);
          setIsStreaming(false);
        }
        break;
      }
      case 'message_edited': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const { messageId, newContent } = payload;
        if (messageId && newContent !== undefined) {
          updateMessageInStore(currentSessionId, messageId, (message) => ({
            ...message,
            content: newContent,
            timestamp: new Date().toISOString(),
          }));
        }
        break;
      }
      case 'message_deleted': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const { messageId } = payload;
        if (messageId) {
          deleteMessageAndSubsequentInStore(currentSessionId, messageId);
        }
        break;
      }
      case 'feedback_received': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const { messageId, feedback } = payload;
        if (messageId && feedback !== undefined) {
          updateFeedbackInStore(currentSessionId, messageId, feedback);
        }
        break;
      }
      case 'regeneration_progress': {
        // P1-005 FIX: Check mounted before state updates
        if (!mountedRef.current) return;

        const { messageId, thoughtProcess, regenerationStep } = payload;
        if (messageId && thoughtProcess) {
          updateThoughtProcessInStore(currentSessionId, messageId, thoughtProcess);

          if (regenerationStep) {
            updateSessionMetaInStore(currentSessionId, {
              regeneratingMessageId: messageId,
              current_phase: regenerationStep,
            });
          }
        }
        break;
      }
      case 'message': {
        // PHASE 3.3: ADK canonical streaming message handler
        // Handles ADK events with content.parts[].text structure
        if (!mountedRef.current) return;

        // FIX: Skip partial events entirely - only process complete chunks
        // Partial events are intermediate and should not create visible messages
        if (payload.partial === true) {
          console.log('[message handler] Skipping partial event - not rendering');
          return;
        }

        // Phase 3.3: Handle error events BEFORE filtering (503, rate limits, etc.)
        // Error events must be displayed to users, not silently discarded
        if (payload.error) {
          console.log('[message handler] Processing error event:', payload.error);
          const messageId = ensureProgressMessage(payload.invocationId);
          if (messageId && mountedRef.current) {
            // Extract error message from various formats
            let errorMessage = 'An error occurred';
            if (typeof payload.error === 'string') {
              errorMessage = payload.error;
            } else if (typeof payload.error === 'object') {
              errorMessage = payload.error.message || payload.error.detail || JSON.stringify(payload.error);
            }

            // Create user-friendly error message
            const displayMessage = `⚠️ **Error:** ${errorMessage}\n\n${
              payload.error?.retry_after
                ? `Please wait ${payload.error.retry_after} seconds and try again.`
                : 'Please try again in a moment.'
            }`;

            updateStreamingMessageInStore(currentSessionId, messageId, displayMessage);
            setMessageCompleted(currentSessionId, messageId);
          }
          return;
        }

        // FIX: Skip events with no user-facing content (tool invocations, thinking, etc.)
        // Events containing only functionCall or thoughtSignature should not be rendered
        if (!hasExtractableContent(payload)) {
          console.log('[message handler] Skipping event - no extractable content (functionCall/thoughtSignature only)');
          return;
        }

        // CRITICAL FIX: Use invocationId to create separate messages for each agent response
        // This prevents the planner's "Does this look good?" from overwriting the plan itself
        const invocationId = payload?.invocationId;
        const messageId = ensureProgressMessage(invocationId);
        if (!messageId || !mountedRef.current) return;

        // Extract content from ADK event structure
        const extractionResult = extractContentFromADKEvent(payload, '');
        const content = extractionResult.content;

        // Only update if we have actual content
        if (content && mountedRef.current) {
          updateStreamingMessageInStore(currentSessionId, messageId, content);
        }

        // Check if this is the final response (has usageMetadata and not partial)
        const isComplete = payload.usageMetadata && !payload.partial;
        if (isComplete && mountedRef.current) {
          completeStreamingMessageInStore(currentSessionId, messageId);
          setSessionStreamingInStore(currentSessionId, false);
          setIsStreaming(false);
          console.log('[message handler] Final response completed with usageMetadata, invocation:', invocationId);
        }

        // Set streaming state for non-complete responses
        if (!isComplete && mountedRef.current) {
          setSessionStreamingInStore(currentSessionId, true);
        }

        break;
      }
      default:
        break;
    }
  }, [
    stableResearchEvent,
    currentSessionId,
    // Removed currentSession - it's an unstable reference that causes infinite loops
    // The effect reads it via closure but doesn't need to re-run when it changes
    addMessageInStore,
    updateProgressInStore,
    updateSessionMetaInStore,
    updateStreamingMessageInStore,
    setSessionStreamingInStore,
    completeStreamingMessageInStore,
    updateMessageInStore,
    deleteMessageAndSubsequentInStore,
    updateFeedbackInStore,
    updateThoughtProcessInStore,
    setIsStreaming,
    setError,
  ]);

  // Handle SSE events for agent coordination (consolidated stream)
  // NOTE: Removed duplicate event handling - since agentSSE === researchSSE (same stream),
  // processing agent events separately was causing duplicate message content.
  // Agent events (agent_status) are now handled in the research event handler above.
  useEffect(() => {
    if (!stableAgentEvent || !currentSessionId) return;

    const { type, agents } = stableAgentEvent;

    // Only handle agent_status events (previously agent_network_update)
    if (type === 'agent_status' && Array.isArray(agents)) {
      updateAgentsInStore(currentSessionId, agents);
    }
  }, [
    stableAgentEvent,
    currentSessionId,
    updateAgentsInStore,
  ]);

  return {
    stableResearchEvent,
    stableAgentEvent,
  };
}
