/**
 * ADK Event Handler - Canonical Mode
 *
 * Processes raw ADK events from canonical streaming endpoint.
 * Handles agent transfers, final responses, errors, and progress updates.
 *
 * Phase 3.2 Frontend Integration
 */

import type { EventHandler } from './index';
import type { AgentNetworkEvent } from '@/lib/api/types';
import type { AdkEvent, ParsedAdkEvent } from '@/lib/streaming/adk/types';
import { useChatStore } from '../store';

/**
 * ADK Event Handler Implementation
 *
 * Processes canonical ADK events and updates Zustand store.
 * Stores raw events for debugging and advanced features.
 */
export class AdkEventHandler implements EventHandler {
  private sessionId: string;
  private cleanupCallbacks: Array<() => void> = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    console.log('[AdkEventHandler] Initialized for session:', sessionId);
  }

  /**
   * Handle incoming AgentNetworkEvent
   *
   * Routes to specialized handlers based on event characteristics.
   * Stores raw ADK event for debugging and analytics.
   */
  handleEvent(event: AgentNetworkEvent): void {
    try {
      // Extract raw ADK event from event data
      const rawEvent = event.data._raw as AdkEvent | undefined;

      if (!rawEvent) {
        console.warn('[AdkEventHandler] Event missing _raw ADK event:', event);
        // Fall back to legacy handling
        this.handleLegacyEvent(event);
        return;
      }

      // Store raw ADK event in circular buffer
      this.storeRawAdkEvent(rawEvent);

      // Route to specialized handlers based on event characteristics
      if (rawEvent.errorCode || rawEvent.errorMessage) {
        this.handleError(rawEvent, event);
      } else if (event.data.isFinalResponse) {
        this.handleFinalResponse(event);
      } else if (event.data.isAgentTransfer) {
        this.handleAgentTransfer(event);
      } else {
        this.handleProgress(event);
      }
    } catch (error) {
      console.error('[AdkEventHandler] Error handling event:', error, event);
    }
  }

  /**
   * Store raw ADK event in session
   * Implements circular buffer (max 1000 events)
   */
  private storeRawAdkEvent(event: AdkEvent): void {
    const store = useChatStore.getState();
    store.storeAdkEvent(this.sessionId, event);
  }

  /**
   * Handle error events
   *
   * Updates session error state and logs error details.
   */
  private handleError(rawEvent: AdkEvent, event: AgentNetworkEvent): void {
    console.error('[AdkEventHandler] Error event received:', {
      errorCode: rawEvent.errorCode,
      errorMessage: rawEvent.errorMessage,
      author: rawEvent.author,
    });

    const store = useChatStore.getState();
    const errorMessage = rawEvent.errorMessage || `Error: ${rawEvent.errorCode}`;

    store.setSessionError(this.sessionId, errorMessage);
    store.setSessionStreaming(this.sessionId, false);
  }

  /**
   * Handle final response events
   *
   * Marks streaming as complete and finalizes the response message.
   */
  private handleFinalResponse(event: AgentNetworkEvent): void {
    console.log('[AdkEventHandler] Final response received:', {
      author: event.data.author,
      messageId: event.data.messageId,
    });

    const store = useChatStore.getState();

    // Update or create message for final response
    if (event.data.messageId) {
      const session = store.sessions[this.sessionId];
      const existingMessage = session?.messages.find(
        (m) => m.id === event.data.messageId
      );

      if (existingMessage) {
        // Complete existing streaming message
        store.completeStreamingMessage(this.sessionId, event.data.messageId);
      } else {
        // Add new final message
        const textContent = event.data.textParts?.join('\n') || '';
        const thoughtContent = event.data.thoughtParts?.join('\n') || '';

        store.addMessage(this.sessionId, {
          id: event.data.messageId || `msg_${Date.now()}`,
          sessionId: this.sessionId,
          content: textContent,
          role: 'assistant',
          timestamp: event.data.timestamp,
          metadata: {
            kind: 'assistant-final',
            completed: true,
            adkEventId: event.data._raw?.id,
            adkInvocationId: event.data._raw?.invocationId,
            adkAuthor: event.data.author,
            thoughtContent: thoughtContent || undefined,
            sources: event.data.sources,
          },
        });
      }
    }

    store.setSessionStreaming(this.sessionId, false);
  }

  /**
   * Handle agent transfer events
   *
   * Tracks agent handoffs and updates agent status.
   */
  private handleAgentTransfer(event: AgentNetworkEvent): void {
    console.log('[AdkEventHandler] Agent transfer:', {
      from: event.data.author,
      to: event.data.transferTargetAgent,
    });

    const store = useChatStore.getState();

    // Create progress update for agent transfer
    const textContent = event.data.textParts?.join('\n') || '';
    const transferMessage = textContent ||
      `Transferring to ${event.data.transferTargetAgent}...`;

    store.addMessage(this.sessionId, {
      id: event.data.messageId || `transfer_${Date.now()}`,
      sessionId: this.sessionId,
      content: transferMessage,
      role: 'assistant',
      timestamp: event.data.timestamp,
      metadata: {
        kind: 'assistant-progress',
        completed: false,
        adkEventId: event.data._raw?.id,
        adkInvocationId: event.data._raw?.invocationId,
        adkAuthor: event.data.author,
      },
    });

    // Update agent status if needed
    // TODO: Add agent status tracking to store
  }

  /**
   * Handle progress/streaming events
   *
   * Updates streaming message content as events arrive.
   */
  private handleProgress(event: AgentNetworkEvent): void {
    const store = useChatStore.getState();
    const session = store.sessions[this.sessionId];

    if (!session) {
      console.warn('[AdkEventHandler] Session not found:', this.sessionId);
      return;
    }

    const textContent = event.data.textParts?.join('\n') || '';
    const thoughtContent = event.data.thoughtParts?.join('\n') || '';

    // Find existing streaming message for this invocation
    const messageId = event.data.messageId || `msg_${event.data._raw?.invocationId}`;
    const existingMessage = session.messages.find((m) => m.id === messageId);

    if (existingMessage) {
      // Update existing streaming message
      store.updateStreamingMessage(this.sessionId, messageId, textContent);

      // Update thought process if available
      if (thoughtContent) {
        store.updateThoughtProcess(this.sessionId, messageId, thoughtContent);
      }
    } else {
      // Create new streaming message
      store.addMessage(this.sessionId, {
        id: messageId,
        sessionId: this.sessionId,
        content: textContent,
        role: 'assistant',
        timestamp: event.data.timestamp,
        metadata: {
          kind: 'assistant-progress',
          completed: false,
          adkEventId: event.data._raw?.id,
          adkInvocationId: event.data._raw?.invocationId,
          adkAuthor: event.data.author,
          thoughtContent: thoughtContent || undefined,
        },
      });

      store.setSessionStreaming(this.sessionId, true);
    }
  }

  /**
   * Fallback handler for events without raw ADK data
   *
   * Handles legacy events that don't have ADK structure.
   */
  private handleLegacyEvent(event: AgentNetworkEvent): void {
    console.log('[AdkEventHandler] Handling legacy event:', event.type);

    const store = useChatStore.getState();

    // Simple text content handling
    const content = typeof event.data === 'object' && 'content' in event.data
      ? String(event.data.content)
      : JSON.stringify(event.data);

    store.addMessage(this.sessionId, {
      id: `legacy_${Date.now()}`,
      sessionId: this.sessionId,
      content,
      role: 'assistant',
      timestamp: event.data.timestamp || new Date().toISOString(),
      metadata: {
        kind: 'assistant-progress',
        completed: false,
      },
    });
  }

  /**
   * Cleanup handler resources
   *
   * Called on unmount or handler replacement.
   */
  cleanup(): void {
    console.log('[AdkEventHandler] Cleaning up for session:', this.sessionId);

    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('[AdkEventHandler] Cleanup callback error:', error);
      }
    });

    this.cleanupCallbacks = [];
  }
}
