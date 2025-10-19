/**
 * Legacy Event Handler - Backward Compatibility
 *
 * Processes events in legacy format (pre-ADK canonical streaming).
 * Maintains existing behavior for sessions created before Phase 3.
 *
 * Phase 3.2 Frontend Integration
 */

import type { EventHandler } from './index';
import type { AgentNetworkEvent } from '@/lib/api/types';
import { useChatStore } from '../store';

/**
 * Legacy Event Handler Implementation
 *
 * Handles events in the original format (flattened data structure).
 * Preserves existing behavior for backward compatibility.
 */
export class LegacyEventHandler implements EventHandler {
  private sessionId: string;
  private cleanupCallbacks: Array<() => void> = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    console.log('[LegacyEventHandler] Initialized for session:', sessionId);
  }

  /**
   * Handle incoming AgentNetworkEvent
   *
   * Routes to specialized handlers based on event type.
   */
  handleEvent(event: AgentNetworkEvent): void {
    try {
      console.log('[LegacyEventHandler] Processing event:', event.type);

      // Route by event type (legacy behavior)
      switch (event.type) {
        case 'connection':
        case 'keepalive':
          this.handleConnection(event);
          break;

        case 'agent_start':
        case 'agent_complete':
        case 'agent_network_update':
          this.handleAgentUpdate(event);
          break;

        case 'research_started':
        case 'research_update':
        case 'research_progress':
          this.handleResearchUpdate(event);
          break;

        case 'research_complete':
        case 'stream_complete':
          this.handleStreamComplete(event);
          break;

        case 'error':
          this.handleError(event);
          break;

        case 'message':
        default:
          this.handleMessage(event);
          break;
      }
    } catch (error) {
      console.error('[LegacyEventHandler] Error handling event:', error, event);
    }
  }

  /**
   * Handle connection and keepalive events
   */
  private handleConnection(event: AgentNetworkEvent): void {
    console.log('[LegacyEventHandler] Connection event:', event.type);
    // No-op for connection events
  }

  /**
   * Handle agent status updates
   */
  private handleAgentUpdate(event: AgentNetworkEvent): void {
    const store = useChatStore.getState();

    // Update agent status if available
    if (event.data.agents && Array.isArray(event.data.agents)) {
      store.updateAgents(this.sessionId, event.data.agents);
    }

    // Add message if there's content
    if (event.data.content) {
      store.addMessage(this.sessionId, {
        id: `agent_${Date.now()}`,
        sessionId: this.sessionId,
        content: String(event.data.content),
        role: 'assistant',
        timestamp: event.data.timestamp || new Date().toISOString(),
        metadata: {
          kind: 'assistant-progress',
          completed: false,
        },
      });
    }
  }

  /**
   * Handle research progress updates
   */
  private handleResearchUpdate(event: AgentNetworkEvent): void {
    const store = useChatStore.getState();

    // Update progress if available
    if (event.data.progress) {
      store.updateProgress(this.sessionId, event.data.progress);
    }

    // Add progress message
    const content = event.data.content || event.data.message || 'Research in progress...';

    store.addMessage(this.sessionId, {
      id: `research_${Date.now()}`,
      sessionId: this.sessionId,
      content: String(content),
      role: 'assistant',
      timestamp: event.data.timestamp || new Date().toISOString(),
      metadata: {
        kind: 'assistant-progress',
        completed: false,
      },
    });

    store.setSessionStreaming(this.sessionId, true);
  }

  /**
   * Handle stream completion
   */
  private handleStreamComplete(event: AgentNetworkEvent): void {
    const store = useChatStore.getState();

    console.log('[LegacyEventHandler] Stream complete');

    // Add final message if there's content
    if (event.data.final_report || event.data.content) {
      const content = event.data.final_report || event.data.content;

      store.addMessage(this.sessionId, {
        id: `final_${Date.now()}`,
        sessionId: this.sessionId,
        content: String(content),
        role: 'assistant',
        timestamp: event.data.timestamp || new Date().toISOString(),
        metadata: {
          kind: 'assistant-final',
          completed: true,
        },
      });
    }

    // Mark streaming as complete
    store.setSessionStreaming(this.sessionId, false);

    // Update session metadata
    if (event.data.final_report) {
      store.updateSessionMeta(this.sessionId, {
        final_report: String(event.data.final_report),
        status: 'complete',
      });
    }
  }

  /**
   * Handle error events
   */
  private handleError(event: AgentNetworkEvent): void {
    console.error('[LegacyEventHandler] Error event:', event.data);

    const store = useChatStore.getState();
    const errorMessage = event.data.error || event.data.message || 'An error occurred';

    store.setSessionError(this.sessionId, String(errorMessage));
    store.setSessionStreaming(this.sessionId, false);
  }

  /**
   * Handle generic message events
   */
  private handleMessage(event: AgentNetworkEvent): void {
    const store = useChatStore.getState();

    // Extract content from various possible locations
    const content =
      event.data.content ||
      event.data.message ||
      event.data.text ||
      JSON.stringify(event.data);

    store.addMessage(this.sessionId, {
      id: event.data.id || `msg_${Date.now()}`,
      sessionId: this.sessionId,
      content: String(content),
      role: (event.data.role as 'user' | 'assistant' | 'system') || 'assistant',
      timestamp: event.data.timestamp || new Date().toISOString(),
      metadata: {
        kind: event.data.kind || 'assistant-progress',
        completed: event.data.completed ?? false,
      },
    });

    // Update streaming state
    if (!event.data.completed) {
      store.setSessionStreaming(this.sessionId, true);
    }
  }

  /**
   * Cleanup handler resources
   */
  cleanup(): void {
    console.log('[LegacyEventHandler] Cleaning up for session:', this.sessionId);

    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('[LegacyEventHandler] Cleanup callback error:', error);
      }
    });

    this.cleanupCallbacks = [];
  }
}
