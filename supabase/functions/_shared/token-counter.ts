/**
 * Token Counting and Context Budget Management
 *
 * Provides utilities for estimating token usage and managing context windows
 * for different AI models. Uses word-based estimation since we can't import
 * npm packages in Deno Edge Functions.
 *
 * Part of the smart context management system (Issue #127).
 *
 * @module token-counter
 */

import { MODELS } from './config.ts';

/**
 * Token budget configuration for a specific model
 */
export interface TokenBudget {
  /** The model identifier (e.g., 'google/gemini-2.5-flash-lite') */
  model: string;
  /** Maximum context window size in tokens */
  maxContextTokens: number;
  /** Tokens reserved for model response */
  reservedForResponse: number;
  /** Safety margin percentage (0.1 = 10%) to prevent edge-case truncation */
  safetyMargin: number;
}

/**
 * Token budget configurations for all supported models
 *
 * IMPORTANT: These budgets are synchronized with model capabilities.
 * Update when model context windows change.
 *
 * Safety margins account for:
 * - Token estimation inaccuracies (word-based vs actual tokenization)
 * - System prompt overhead
 * - Streaming buffer requirements
 * - Model-specific quirks
 */
export const MODEL_BUDGETS: Record<string, TokenBudget> = {
  [MODELS.GEMINI_FLASH]: {
    model: MODELS.GEMINI_FLASH,
    maxContextTokens: 128000,
    reservedForResponse: 4096,
    safetyMargin: 0.1 // 10% safety margin
  },
  [MODELS.KIMI_K2]: {
    model: MODELS.KIMI_K2,
    maxContextTokens: 128000,
    reservedForResponse: 8192,
    safetyMargin: 0.15 // 15% safety margin (more conservative due to reasoning tokens)
  }
} as const;

/**
 * Message token count metadata
 */
export interface MessageTokenCount {
  /** Message ID (if available) */
  id?: string;
  /** Message role (user/assistant/system) */
  role: string;
  /** Estimated token count for this message */
  tokens: number;
  /** Message timestamp (if available) */
  timestamp?: string;
}

/**
 * Estimate token count for text using word-based heuristic
 *
 * This is a simplified estimation since we can't use tiktoken or other
 * npm tokenizers in Deno Edge Functions. The 1.3 multiplier accounts for:
 * - Punctuation and special characters
 * - Multi-token words
 * - JSON formatting overhead
 *
 * Accuracy: ~85% for English text, less accurate for code/JSON
 *
 * @param text - Text to count tokens for
 * @returns Estimated token count
 *
 * @example
 * ```ts
 * const tokens = countTokens("Hello, world!"); // ~3 tokens
 * const codeTokens = countTokens("const x = 42;"); // ~4 tokens
 * ```
 */
export function countTokens(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Split by whitespace and filter empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);

  // Apply 1.3 multiplier to account for tokenization overhead
  return Math.ceil(words.length * 1.3);
}

/**
 * Calculate available context budget after reservations
 *
 * Formula: maxContextTokens - reservedForResponse - (maxContextTokens * safetyMargin)
 *
 * @param model - Model identifier (must exist in MODEL_BUDGETS)
 * @returns Available tokens for conversation history
 * @throws Error if model not found in MODEL_BUDGETS
 *
 * @example
 * ```ts
 * const available = calculateContextBudget(MODELS.GEMINI_FLASH);
 * console.log(`Can use ${available} tokens for history`); // ~111,400 tokens
 * ```
 */
export function calculateContextBudget(model: string): number {
  const budget = MODEL_BUDGETS[model];

  if (!budget) {
    throw new Error(
      `Unknown model: ${model}. Available models: ${Object.keys(MODEL_BUDGETS).join(', ')}`
    );
  }

  const safetyTokens = Math.ceil(budget.maxContextTokens * budget.safetyMargin);
  const availableTokens = budget.maxContextTokens - budget.reservedForResponse - safetyTokens;

  return Math.max(0, availableTokens);
}

/**
 * Calculate token counts for array of messages
 *
 * Processes each message's content and returns metadata with token estimates.
 * Handles both string content and stringified JSON content.
 *
 * @param messages - Array of messages with role, content, and optional metadata
 * @returns Array of message token counts with metadata
 *
 * @example
 * ```ts
 * const messages = [
 *   { role: 'user', content: 'Hello!', id: '1', created_at: '2025-01-15' },
 *   { role: 'assistant', content: 'Hi there!', id: '2', created_at: '2025-01-15' }
 * ];
 * const counts = getMessageTokenCounts(messages);
 * console.log(counts); // [{ id: '1', role: 'user', tokens: 2, timestamp: '2025-01-15' }, ...]
 * ```
 */
export function getMessageTokenCounts(
  messages: Array<{
    role: string;
    content: string;
    id?: string;
    created_at?: string;
  }>
): MessageTokenCount[] {
  return messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    tokens: countTokens(msg.content),
    timestamp: msg.created_at
  }));
}

/**
 * Get token budget details for a specific model
 *
 * @param model - Model identifier
 * @returns Token budget configuration or undefined if model not found
 *
 * @example
 * ```ts
 * const budget = getModelBudget(MODELS.GEMINI_FLASH);
 * if (budget) {
 *   console.log(`Model: ${budget.model}`);
 *   console.log(`Max context: ${budget.maxContextTokens}`);
 *   console.log(`Reserved: ${budget.reservedForResponse}`);
 * }
 * ```
 */
export function getModelBudget(model: string): TokenBudget | undefined {
  return MODEL_BUDGETS[model];
}

// ============================================================================
// BACKWARD COMPATIBILITY LAYER
// ============================================================================
// These functions maintain compatibility with existing code (context-selector.ts)
// that uses the old token counting interface.

/**
 * Message interface for backward compatibility
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_steps?: string | null;
}

/**
 * Estimates token count for a single message (backward compatible)
 *
 * @deprecated Use countTokens() for new code
 * @param message - The message to count tokens for
 * @returns Estimated token count
 */
export function countMessageTokens(message: Message): number {
  const contentTokens = countTokens(message.content);
  const reasoningTokens = message.reasoning_steps
    ? countTokens(message.reasoning_steps)
    : 0;

  // Add overhead for role and formatting (~10 tokens per message)
  return contentTokens + reasoningTokens + 10;
}

/**
 * Estimates total token count for an array of messages (backward compatible)
 *
 * @deprecated Use getMessageTokenCounts() for new code
 * @param messages - Array of messages to count
 * @returns Total estimated token count
 */
export function countTotalTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => total + countMessageTokens(msg), 0);
}

/**
 * Estimates token count for a text string (backward compatible)
 *
 * @deprecated Use countTokens() for new code
 * @param text - The text to count tokens for
 * @returns Estimated token count
 */
export function countTextTokens(text: string): number {
  return countTokens(text);
}
