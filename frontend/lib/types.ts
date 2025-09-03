// Essential types for Vana frontend
// This file provides minimal type definitions to satisfy existing imports
// without requiring AI SDK compatibility layers

// Attachment interface for file uploads
export interface Attachment {
  id?: string;
  name: string;
  contentType: string;
  size?: number;
  url: string;
}

// Re-export ChatMessage with AI SDK compatibility
export type { ChatMessage } from './types/ai-compat';

// Stream part types for handling AI SDK stream responses
export interface TextPart {
  type: 'text';
  text: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  output?: unknown;
}

export interface ToolResultPart {
  type: 'tool-result';
  output?: unknown;
}

export interface StreamPart {
  type: string;
  data?: unknown;
  output?: unknown;
  text?: string;
}

// Weather location type (defined in weather.tsx)
// WeatherAtLocation is imported from weather component when needed

// Artifact reference type for stream parts
export interface ArtifactRef {
  id: string;
  title: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
}

// Custom UI data types for Vana-specific features
export interface CustomUIDataTypes {
  // Text and content deltas
  textDelta: string;
  codeDelta: string;
  imageDelta: string;
  sheetDelta: string;

  // Message and metadata
  appendMessage: string;
  suggestion: any;

  // Document metadata
  id: string;
  title: string;
  kind: string;
  clear: boolean;

  // Agent and progress tracking
  agentProgress: {
    agent_id: string;
    task_id: string;
    progress: number;
    status: 'running' | 'completed' | 'failed';
    message?: string;
  };

  // Tool interactions
  toolCall: {
    tool_name: string;
    parameters: any;
  };

  // Error handling
  error: {
    message: string;
    code?: string;
  };

  // Index signature to satisfy UIDataTypes constraint
  [key: string]: unknown;
}

// Chat tools interface
export interface ChatTools {
  [key: string]: any;
}

/**
 * Extract text content from a ChatMessage
 * Handles both string content and parts-based content
 */
export function extractMessageContent(message: any): string {
  if (!message) return '';
  
  // If content is a string, return it directly
  if (typeof message.content === 'string') {
    return message.content;
  }
  
  // If message has parts property, extract text from text parts
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part: TextPart | StreamPart): part is TextPart => part.type === 'text' && 'text' in part && Boolean(part.text))
      .map((part: TextPart) => part.text)
      .join('');
  }
  
  return '';
}

/**
 * Get the creation timestamp from a ChatMessage
 * Returns ISO string format
 */
export function getMessageCreatedAt(message: any): string {
  if (message.createdAt) {
    return message.createdAt;
  }
  
  // Fallback to current timestamp
  return new Date().toISOString();
}
