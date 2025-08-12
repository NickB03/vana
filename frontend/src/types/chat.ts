/**
 * TypeScript interfaces for the chat system
 */

// Import SSE types from existing lib
import type { SSEEvent, ResearchSourcesEvent, AgentStartEvent, AgentCompleteEvent } from '../../lib/sse/types';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface BaseMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status: MessageStatus;
}

export interface UserMessage extends BaseMessage {
  role: 'user';
  attachments?: FileAttachment[];
  isEditing?: boolean;
  originalContent?: string;
}

export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  agentId?: string;
  agentName?: string;
  agentType?: string;
  researchSources?: ResearchSource[];
  codeBlocks?: CodeBlock[];
  streamingContent?: string;
  tokens?: MessageToken[];
}

export interface SystemMessage extends BaseMessage {
  role: 'system';
  severity?: 'info' | 'warning' | 'error';
}

export type ChatMessage = UserMessage | AssistantMessage | SystemMessage;

export interface MessageToken {
  id: string;
  content: string;
  timestamp: number;
  messageId: string;
}

export interface ResearchSource {
  url: string;
  title: string;
  relevance: number;
  summary?: string;
  favicon?: string;
  publishedDate?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
  uploadProgress?: number;
  error?: string;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
  canOpenInCanvas?: boolean;
  lineNumbers?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  agentConfig?: AgentConfig;
}

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamingState {
  isStreaming: boolean;
  currentMessageId?: string;
  currentAgentId?: string;
  queuedTokens: MessageToken[];
  buffer: string;
}

export interface ChatError {
  id: string;
  message: string;
  type: 'network' | 'server' | 'validation' | 'stream';
  timestamp: number;
  details?: any;
  retryable?: boolean;
}

// UI State interfaces
export interface ChatUIState {
  isInputFocused: boolean;
  isScrolledToBottom: boolean;
  showResearchSources: boolean;
  showAgentInfo: boolean;
  selectedMessageId?: string;
  searchQuery?: string;
  filterByAgent?: string;
}

// Event handlers for SSE integration
export interface ChatEventHandlers {
  onMessageToken: (token: MessageToken) => void;
  onMessageComplete: (messageId: string) => void;
  onAgentStart: (agent: AgentStartEvent) => void;
  onAgentComplete: (agent: AgentCompleteEvent) => void;
  onResearchSources: (sources: ResearchSourcesEvent) => void;
  onError: (error: ChatError) => void;
}

// Virtualization support
export interface MessageListItem {
  index: number;
  message: ChatMessage;
  height: number;
  isVisible: boolean;
}

// Canvas integration
export interface CanvasItem {
  id: string;
  type: 'markdown' | 'code' | 'web' | 'sandbox';
  title: string;
  content: string;
  language?: string;
  sourceMessageId?: string;
}

// Auto-scroll configuration
export interface AutoScrollConfig {
  enabled: boolean;
  threshold: number; // pixels from bottom to trigger auto-scroll
  smoothness: 'instant' | 'smooth';
  userOverride: boolean; // true when user manually scrolls
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: string;
  description: string;
}

export interface ChatKeyboardShortcuts {
  sendMessage: KeyboardShortcut;
  newLine: KeyboardShortcut;
  editLastMessage: KeyboardShortcut;
  focusInput: KeyboardShortcut;
  clearChat: KeyboardShortcut;
  toggleSources: KeyboardShortcut;
}