/**
 * Kibo UI types for AI components
 * Enhanced for Vana with proper TypeScript support
 */

import { ReactNode } from 'react';

export interface AIModel {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Model description */
  description?: string;
  /** Model provider */
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  /** Whether model supports streaming */
  streaming: boolean;
  /** Context window size */
  contextWindow: number;
  /** Model capabilities */
  capabilities: {
    text: boolean;
    vision: boolean;
    tools: boolean;
    json: boolean;
  };
  /** Model pricing (optional) */
  pricing?: {
    input: number; // per 1k tokens
    output: number; // per 1k tokens
  };
}

export interface AITool {
  /** Tool identifier */
  id: string;
  /** Tool name */
  name: string;
  /** Tool icon */
  icon: ReactNode;
  /** Tool description */
  description: string;
  /** Whether tool is enabled */
  enabled: boolean;
  /** Tool configuration */
  config?: Record<string, unknown>;
}

export interface AIInputState {
  /** Current input value */
  value: string;
  /** Selected model */
  selectedModel: AIModel | null;
  /** Active tools */
  activeTools: AITool[];
  /** Whether input is processing */
  isProcessing: boolean;
  /** Whether input is focused */
  isFocused: boolean;
  /** Input validation errors */
  errors: string[];
}

export interface AIInputConfig {
  /** Available models */
  models: AIModel[];
  /** Available tools */
  tools: AITool[];
  /** Default model */
  defaultModel?: string;
  /** Maximum input length */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to auto-focus */
  autoFocus?: boolean;
  /** Input variant */
  variant?: 'default' | 'compact' | 'minimal';
}

export interface AIInputCallbacks {
  /** Called when input value changes */
  onValueChange?: (value: string) => void;
  /** Called when form is submitted */
  onSubmit?: (value: string, model: AIModel | null, tools: AITool[]) => void;
  /** Called when model is selected */
  onModelSelect?: (model: AIModel) => void;
  /** Called when tool is toggled */
  onToolToggle?: (tool: AITool, enabled: boolean) => void;
  /** Called when input gains focus */
  onFocus?: () => void;
  /** Called when input loses focus */
  onBlur?: () => void;
}

/**
 * Conversation types for AI chat interfaces
 */
export interface AIMessage {
  /** Message ID */
  id: string;
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Message timestamp */
  timestamp: string;
  /** Model used (for assistant messages) */
  model?: AIModel;
  /** Tools used (for assistant messages) */
  tools?: AITool[];
  /** Message metadata */
  metadata?: Record<string, unknown>;
}

export interface AIConversation {
  /** Conversation ID */
  id: string;
  /** Conversation title */
  title: string;
  /** Messages in conversation */
  messages: AIMessage[];
  /** Active model */
  activeModel: AIModel | null;
  /** Active tools */
  activeTools: AITool[];
  /** Conversation created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * AI thinking/reasoning types
 */
export interface AIThinkingStep {
  /** Step ID */
  id: string;
  /** Step title */
  title: string;
  /** Step content */
  content: string;
  /** Step status */
  status: 'pending' | 'processing' | 'completed' | 'error';
  /** Step timestamp */
  timestamp: string;
  /** Step duration (ms) */
  duration?: number;
}

export interface AIThinkingProcess {
  /** Process ID */
  id: string;
  /** Process title */
  title: string;
  /** Process steps */
  steps: AIThinkingStep[];
  /** Overall status */
  status: 'idle' | 'thinking' | 'completed' | 'error';
  /** Start timestamp */
  startedAt: string;
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Component prop types
 */
export interface AIInputProps extends AIInputConfig, AIInputCallbacks {
  /** Component class name */
  className?: string;
  /** Whether component is disabled */
  disabled?: boolean;
  /** Component size */
  size?: 'sm' | 'default' | 'lg';
}

export interface AIConversationProps {
  /** Conversation data */
  conversation: AIConversation;
  /** Whether conversation is loading */
  isLoading?: boolean;
  /** Callback when message is sent */
  onSendMessage?: (message: string) => void;
  /** Component class name */
  className?: string;
}

export interface AIThinkingProps {
  /** Thinking process data */
  process: AIThinkingProcess;
  /** Whether to show detailed steps */
  showSteps?: boolean;
  /** Component class name */
  className?: string;
}

/**
 * Default configurations
 */
export const DEFAULT_AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    streaming: true,
    contextWindow: 8192,
    capabilities: {
      text: true,
      vision: false,
      tools: true,
      json: true,
    },
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    streaming: true,
    contextWindow: 200000,
    capabilities: {
      text: true,
      vision: true,
      tools: true,
      json: true,
    },
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    streaming: true,
    contextWindow: 32768,
    capabilities: {
      text: true,
      vision: true,
      tools: true,
      json: true,
    },
  },
];

export const DEFAULT_AI_TOOLS: AITool[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    icon: '🔍',
    description: 'Search the web for current information',
    enabled: false,
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    icon: '📎',
    description: 'Upload and analyze files',
    enabled: false,
  },
  {
    id: 'code-execution',
    name: 'Code Execution',
    icon: '⚡',
    description: 'Execute code in a secure environment',
    enabled: false,
  },
];