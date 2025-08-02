/**
 * ADK Event Types
 * These types define the structure of events received from the ADK backend via SSE
 */

// Function call structure
export interface ADKFunctionCall {
  name: string;
  args: Record<string, any>;
  id: string;
}

// Function response structure
export interface ADKFunctionResponse {
  name: string;
  response: any;
  id: string;
}

// Content part can be text, function call, or function response
export interface ADKContentPart {
  text?: string;
  functionCall?: ADKFunctionCall;
  functionResponse?: ADKFunctionResponse;
}

// Main content structure
export interface ADKContent {
  parts: ADKContentPart[];
  role?: string;
}

// State delta for research results
export interface ADKStateDelta {
  research_plan?: string;
  final_report_with_citations?: string;
  url_to_short_id?: Record<string, string>;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

// Actions that can modify state
export interface ADKActions {
  stateDelta?: ADKStateDelta;
}

// Usage metadata for token tracking
export interface ADKUsageMetadata {
  candidatesTokenCount: number;
  promptTokenCount: number;
  totalTokenCount: number;
}

// Main SSE event structure from ADK
export interface ADKSSEEvent {
  content?: ADKContent;
  author: string;
  actions?: ADKActions;
  usageMetadata?: ADKUsageMetadata;
  groundingMetadata?: any;
}

// Agent names that appear in the author field
export type ADKAgentName = 
  | 'interactive_planner_agent'
  | 'plan_generator'
  | 'section_planner'
  | 'section_researcher'
  | 'research_evaluator'
  | 'enhanced_search_executor'
  | 'report_composer_with_citations'
  | 'research_pipeline'
  | 'iterative_refinement_loop'
  | 'escalation_checker';

// UI Event data structures
export interface ThinkingUpdate {
  stepId: string;
  agent: string;
  action: string;
  status: 'pending' | 'active' | 'complete';
  timestamp?: number;
  duration?: string;
  category?: 'planner' | 'researcher' | 'composer' | 'evaluator' | 'executor';
}

export interface MessageUpdate {
  messageId: string;
  content: string;
  isComplete: boolean;
  isPartial?: boolean;
  format?: 'markdown' | 'text' | 'html';
}

export interface WorkflowUpdate {
  phase: 'planning' | 'research' | 'reporting';
  status: 'pending' | 'active' | 'complete' | 'error';
  data: Record<string, any>;
}

// WebSocket-compatible event structure
export type UIEvent = 
  | { type: 'thinking_update'; data: ThinkingUpdate }
  | { type: 'message_update'; data: MessageUpdate }
  | { type: 'workflow_update'; data: WorkflowUpdate }
  | { type: 'error'; data: { message: string } }
  | { type: 'connection'; data: { status: 'connected' | 'disconnected' | 'reconnecting' } };