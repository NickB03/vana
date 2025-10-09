/**
 * SSE event handling for research and agent updates
 */

import { useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ResearchProgress } from '../../lib/api/types';
import { useChatStore } from './store';
import { ChatSession, StableResearchEvent, StableAgentEvent } from './types';

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
    researchSSE.lastEvent?.data?.timestamp,
    researchSSE.lastEvent?.data?.current_phase,
    researchSSE.lastEvent?.data?.overall_progress,
    researchSSE.lastEvent?.data?.status,
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
    JSON.stringify(agentSSE.lastEvent?.data?.agents), // Serialize array for stable comparison
    agentSSE.lastEvent?.data?.messageId, // For message action events
    agentSSE.lastEvent?.data?.newContent, // For message edit events
    agentSSE.lastEvent?.data?.feedback, // For feedback events
    agentSSE.lastEvent?.data?.thoughtProcess, // For regeneration events
    agentSSE.lastEvent?.data?.regenerationStep, // For regeneration events
    currentSessionId,
  ]);

  /**
   * Creates a progress message if it doesn't exist
   */
  const ensureProgressMessage = () => {
    if (!currentSessionId || !currentSession) return null;

    const progressMessage = currentSession.messages.find(
      msg => msg.role === 'assistant' && msg.metadata?.kind === 'assistant-progress'
    );

    if (progressMessage) return progressMessage.id;

    const messageId = `msg_${uuidv4()}_assistant_progress`;
    const placeholder: ChatMessage = {
      id: messageId,
      content: 'Preparing research response...',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId,
      metadata: { kind: 'assistant-progress' },
    };
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
    if (!stableResearchEvent || !currentSessionId) return;

    const { type, payload } = stableResearchEvent;
    const session = currentSession;
    if (!session) return;

    switch (type) {
      case 'research_started': {
        const messageId = ensureProgressMessage();
        if (messageId) {
          updateStreamingMessageInStore(
            currentSessionId,
            messageId,
            'Research session acknowledged. Coordinating agent network...'
          );
        }
        setSessionStreamingInStore(currentSessionId, true);
        break;
      }
      case 'research_update':
      case 'research_progress': {
        const messageId = ensureProgressMessage();
        if (messageId) {
          // For research_update, use content directly; for research_progress, format it
          const content = type === 'research_update'
            ? payload.content || formatProgressContent(payload)
            : formatProgressContent(payload);
          updateStreamingMessageInStore(currentSessionId, messageId, content);
        }

        mergeProgressSnapshot({
          status: payload.status ?? 'running',
          overall_progress: typeof payload.overall_progress === 'number'
            ? (payload.overall_progress <= 1 ? payload.overall_progress : payload.overall_progress / 100)
            : undefined,
          current_phase: payload.current_phase,
          partial_results: payload.partial_results,
          agents: Array.isArray(payload.agents) ? payload.agents : undefined,
        });

        setSessionStreamingInStore(currentSessionId, true);
        break;
      }
      case 'research_complete': {
        const messageId = ensureProgressMessage();

        if (messageId) {
          // Don't update content - it's already complete from research_update events
          // Just mark the message as completed
          completeStreamingMessageInStore(currentSessionId, messageId);
        }

        // Get existing message content for final_report
        const existingMessage = currentSession?.messages.find(msg => msg.id === messageId);
        const finalContent = existingMessage?.content || 'Research complete. (No report returned)';

        setSessionStreamingInStore(currentSessionId, false);
        mergeProgressSnapshot({
          status: 'completed',
          overall_progress: 1,
          current_phase: payload.current_phase ?? 'Research complete',
          final_report: finalContent,
        });
        setIsStreaming(false);
        break;
      }
      case 'error': {
        const messageId = ensureProgressMessage();
        const message = payload.message || payload.error || 'An error occurred during research.';
        if (messageId) {
          updateStreamingMessageInStore(currentSessionId, messageId, `Error: ${message}`);
          completeStreamingMessageInStore(currentSessionId, messageId);
        }
        setSessionStreamingInStore(currentSessionId, false);
        mergeProgressSnapshot({ status: 'error', error: message });
        setError(message);
        setIsStreaming(false);
        break;
      }
      case 'connection': {
        if (payload.status === 'disconnected') {
          setSessionStreamingInStore(currentSessionId, false);
          setIsStreaming(false);
        }
        break;
      }
      case 'message_edited': {
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
        const { messageId } = payload;
        if (messageId) {
          deleteMessageAndSubsequentInStore(currentSessionId, messageId);
        }
        break;
      }
      case 'feedback_received': {
        const { messageId, feedback } = payload;
        if (messageId && feedback !== undefined) {
          updateFeedbackInStore(currentSessionId, messageId, feedback);
        }
        break;
      }
      case 'regeneration_progress': {
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
