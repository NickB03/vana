// AI SDK compatibility types
// Provides type definitions that bridge our ChatMessage with AI SDK

import type { UIMessage } from 'ai';

// ChatMessage is a specific instance of UIMessage with our custom metadata
export type ChatMessage = UIMessage<any> & {
  content?: string;
  createdAt?: string;
};