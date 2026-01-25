/**
 * SSE Event Types
 *
 * Type definitions for Server-Sent Events (SSE) streaming from the chat endpoint.
 * These match the backend event types in supabase/functions/chat/index.ts.
 */

/**
 * Intent confirmation event
 * Sent before tool execution to confirm the AI's plan to the user
 *
 * @example
 * {
 *   type: 'intent_confirmation',
 *   message: "I'll build a todo app for you...",
 *   toolName: "generate_artifact",
 *   timestamp: 1234567890
 * }
 */
export interface IntentConfirmationEvent {
  type: 'intent_confirmation';
  message: string;
  toolName: string;
  timestamp: number;
}

/**
 * Tool call start event
 * Sent when a tool execution begins
 */
export interface ToolCallStartEvent {
  type: 'tool_call_start';
  toolName: string;
  arguments?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Tool result event
 * Sent when a tool execution completes
 */
export interface ToolResultEvent {
  type: 'tool_result';
  toolName: string;
  success: boolean;
  sourceCount?: number;
  latencyMs?: number;
  timestamp: number;
}

/**
 * Status update event
 * General status updates during streaming
 */
export interface StatusUpdateEvent {
  type: 'status_update';
  status: string;
  final?: boolean;
}

/**
 * Reasoning status event
 * Semantic reasoning status from GLM-4.5-Air
 */
export interface ReasoningStatusEvent {
  type: 'reasoning_status';
  status: string;
  confidence?: string;
}

/**
 * Union type of all SSE events
 */
export type SSEEvent =
  | IntentConfirmationEvent
  | ToolCallStartEvent
  | ToolResultEvent
  | StatusUpdateEvent
  | ReasoningStatusEvent;
