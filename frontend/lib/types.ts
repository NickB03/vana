import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

// Main ChatMessage type - compatible with AI SDK
export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
> & {
  content?: string;
  createdAt?: string;
};

// Enhanced ChatMessage interface for places that need content/createdAt
export interface EnhancedChatMessage extends ChatMessage {
  content: string;
  createdAt: string;
}

// Legacy compatibility type
export type ChatMessageCompat = ChatMessage;


export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

// Stream provider types for VanaDataStreamContextValue
export type StreamProvider = 'vercel' | 'vana' | 'hybrid';

// Error types for consistent error handling
export type KnownError = {
  message: string;
  code?: string;
  status?: number;
};

// Toast types including warning
export type ToastType = 'success' | 'error' | 'warning';

// Toast props interface
export interface ToastProps {
  id: string | number;
  type: ToastType;
  description: string;
}

// Event types for SSE handling
export interface VanaSSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
  timestamp?: number;
}

// Utility functions for ChatMessage
export function extractMessageContent(message: ChatMessage | ChatMessageCompat): string {
  // First, check if message has parts array and extract text from it
  if (message.parts && message.parts.length > 0) {
    // Find text parts and concatenate them
    const textParts = message.parts.filter((part): part is { type: 'text'; text: string } =>
      part.type === 'text' && 'text' in part && typeof part.text === 'string'
    );
    if (textParts.length > 0) {
      return textParts.map(part => part.text).join('');
    }
  }
  
  // Fallback to content property if no parts or no text parts found
  if (message.content && typeof message.content === 'string') {
    return message.content;
  }
  
  return '';
}

export function getMessageCreatedAt(message: ChatMessage | ChatMessageCompat): string {
  // Check metadata.createdAt first (preferred source)
  if (message.metadata?.createdAt) {
    return message.metadata.createdAt;
  }
  
  // Then check direct createdAt property
  if (message.createdAt && typeof message.createdAt === 'string') {
    return message.createdAt;
  }
  
  // Fallback to current time
  return new Date().toISOString();
}

// Type guard for proper error handling in catch blocks
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Type-safe error handler
export function handleCatchError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('Unknown error occurred');
}
