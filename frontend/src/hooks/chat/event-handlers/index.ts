/**
 * Event Handler Factory - Phase 3.2 Frontend Integration
 *
 * Factory pattern for creating event handlers based on feature flag.
 * Routes to canonical ADK handler or legacy handler.
 *
 * Usage:
 * ```typescript
 * const handler = createEventHandler(sessionId);
 * handler.handleEvent(event);
 * handler.cleanup();
 * ```
 */

import { isAdkCanonicalStreamEnabled } from '@/lib/env';
import { AdkEventHandler } from './adk-event-handler';
import { LegacyEventHandler } from './legacy-event-handler';
import type { AgentNetworkEvent } from '@/lib/api/types';

/**
 * EventHandler interface
 * Common interface for all event handler implementations
 */
export interface EventHandler {
  /**
   * Handle incoming SSE event
   * @param event - AgentNetworkEvent to process
   */
  handleEvent(event: AgentNetworkEvent): void;

  /**
   * Cleanup handler resources
   * Called on unmount or handler replacement
   */
  cleanup(): void;
}

/**
 * Create event handler based on feature flag
 *
 * @param sessionId - Current chat session ID
 * @returns EventHandler instance (ADK or Legacy)
 */
export function createEventHandler(sessionId: string): EventHandler {
  const isCanonical = isAdkCanonicalStreamEnabled();

  if (isCanonical) {
    console.log('[Event Handler Factory] Using CANONICAL ADK handler for session:', sessionId);
    return new AdkEventHandler(sessionId);
  } else {
    console.log('[Event Handler Factory] Using LEGACY handler for session:', sessionId);
    return new LegacyEventHandler(sessionId);
  }
}

// Re-export handler classes for direct usage (testing)
export { AdkEventHandler } from './adk-event-handler';
export { LegacyEventHandler } from './legacy-event-handler';
