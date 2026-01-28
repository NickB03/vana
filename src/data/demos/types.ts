/**
 * Demo Preview Types - MVP Version
 *
 * Simplified types for the JSON-driven demo preview system.
 * These are designed to be a subset of the full DemoData types
 * defined in the implementation plan, allowing incremental expansion.
 */

export type DemoPhase =
  | 'idle'
  | 'user-typing'
  | 'thinking'
  | 'reasoning'
  | 'assistant-typing'
  | 'artifact'
  | 'hold';

export interface DemoTimelineEvent {
  type: 'user-message' | 'thinking-start' | 'reasoning-chunk' | 'thinking-end' | 'assistant-message' | 'artifact-appear' | 'hold';
  content?: string;
  at: number;        // ms from start
  duration?: number; // ms for typing animations
  until?: number;    // ms for hold events
}

export interface DemoArtifactMVP {
  type: 'react' | 'image' | 'mermaid' | 'markdown';
  title: string;
  subtitle?: string;
  badge?: string;
  // For MVP, we use a static preview instead of live rendering
  previewContent?: React.ReactNode;
}

export interface DemoDataMVP {
  id: string;
  name: string;
  description: string;
  timeline: DemoTimelineEvent[];
  artifact: DemoArtifactMVP;
  userMessage: string;
  assistantMessage: string;
  reasoningChunks: string[];
  // Total duration before looping
  cycleDuration: number;
}

export interface DemoReplayState {
  phase: DemoPhase;
  visibleUserMessage: string;
  visibleAssistantMessage: string;
  visibleReasoningChunks: string[];
  artifactVisible: boolean;
  progress: number; // 0-1
  isComplete: boolean;
}
