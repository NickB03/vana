/**
 * Research Components Exports
 * 
 * Central export point for all research-related components, hooks, and services.
 */

export { ResearchChatInterface } from './research-chat-interface';
export { ResearchProgressPanel } from './research-progress-panel';
export { AgentStatusDisplay, AgentStatusBar } from './agent-status-display';

// Re-export hooks and services for convenience
export { useResearchSSE, useAgentStatusTracker, useResearchResults } from '@/hooks/use-research-sse';
export { researchSSEService } from '@/lib/research-sse-service';
export type {
  ResearchSessionState,
  AgentStatus,
  ResearchRequest,
  ResearchSSEEvent,
  ResearchProgressEvent,
  ConnectionEvent,
  ResearchCompleteEvent,
  ErrorEvent,
} from '@/lib/research-sse-service';