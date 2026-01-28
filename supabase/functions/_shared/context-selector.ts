/**
 * Smart context management system for AI chat applications.
 *
 * Implements importance-based message selection to fit conversations
 * within model token budgets while preserving critical information.
 *
 * Strategy:
 * 1. Always keep recent messages (high temporal relevance)
 * 2. Rank older messages by importance (entities, code, length)
 * 3. Select highest-importance older messages until budget filled
 * 4. Identify remaining messages for summarization
 */

import type { Message } from './token-counter.ts';
import { countTokens } from './token-counter.ts';
import { rankMessageImportance } from './context-ranker.ts';

/**
 * Calculates total token count for messages array.
 * Uses new token-counter API (countTokens).
 * @internal Replaces deprecated countTotalTokens()
 */
function getTotalMessageTokens(
  messages: Array<{ role: string; content: string; reasoning_steps?: string | null }>
): number {
  return messages.reduce((total, msg) => total + getIndividualMessageTokens(msg), 0);
}

/**
 * Calculates token count for a single message.
 * Includes content, reasoning_steps, and formatting overhead.
 * @internal Replaces deprecated countMessageTokens()
 */
function getIndividualMessageTokens(
  message: { role: string; content: string; reasoning_steps?: string | null }
): number {
  const contentTokens = countTokens(message.content);
  const reasoningTokens = message.reasoning_steps
    ? countTokens(message.reasoning_steps)
    : 0;
  // Add overhead for role and formatting (~10 tokens per message)
  return contentTokens + reasoningTokens + 10;
}

/**
 * Configuration options for context selection.
 */
export interface ContextOptions {
  /**
   * Set of entities (variables, functions, concepts) to prioritize.
   * Messages mentioning these entities are more likely to be kept.
   */
  trackedEntities?: Set<string>;

  /**
   * Number of most recent messages to always keep (default: 5).
   * These are never summarized as they have highest temporal relevance.
   */
  alwaysKeepRecent?: number;

  /**
   * Token budget reserved for conversation summary (default: 500).
   * Only used if summarization is needed.
   */
  summaryBudget?: number;
}

/**
 * Result of context selection process.
 */
export interface ContextSelectionResult {
  /**
   * Messages selected to be sent in full to the model.
   * Maintains chronological order.
   */
  selectedMessages: Message[];

  /**
   * Messages identified for summarization.
   * These will be replaced with a summary to save tokens.
   */
  summarizedMessages: Message[];

  /**
   * Generated conversation summary (null if no summarization needed).
   * This will be populated by the caller after summarization.
   */
  summary: string | null;

  /**
   * Total token count of the final context.
   */
  totalTokens: number;

  /**
   * Strategy used for selection.
   */
  strategy: 'full_context' | 'importance_based_selection';
}

const DEFAULT_OPTIONS: Required<ContextOptions> = {
  trackedEntities: new Set(),
  alwaysKeepRecent: 5,
  summaryBudget: 500,
};

/**
 * Selects optimal subset of messages to fit within token budget.
 *
 * @param messages - Full conversation history (chronological order)
 * @param tokenBudget - Maximum tokens allowed for context
 * @param options - Selection configuration
 * @returns Context selection result with selected/summarized messages
 *
 * @example
 * ```typescript
 * const result = await selectContext(messages, 8000, {
 *   trackedEntities: new Set(['UserAuth', 'validateToken']),
 *   alwaysKeepRecent: 5
 * });
 *
 * if (result.strategy === 'importance_based_selection') {
 *   // Generate summary for result.summarizedMessages
 *   result.summary = await generateSummary(result.summarizedMessages);
 * }
 * ```
 */
export async function selectContext(
  messages: Message[],
  tokenBudget: number,
  options: ContextOptions = {}
): Promise<ContextSelectionResult> {
  const opts: Required<ContextOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const totalTokens = getTotalMessageTokens(messages);

  // Fast path: All messages fit within budget
  if (totalTokens <= tokenBudget) {
    return {
      selectedMessages: messages,
      summarizedMessages: [],
      summary: null,
      totalTokens,
      strategy: 'full_context',
    };
  }

  // Split messages into recent (always keep) and older (rank by importance)
  const recentCount = Math.min(opts.alwaysKeepRecent, messages.length);
  const recentMessages = messages.slice(-recentCount);
  const olderMessages = messages.slice(0, -recentCount);

  // Reserve budget for recent messages and potential summary
  const recentTokens = getTotalMessageTokens(recentMessages);
  const remainingBudget = tokenBudget - recentTokens - opts.summaryBudget;

  // Rank older messages by importance
  // Add temporary id for tracking since Message type doesn't have id
  const messagesWithIds = olderMessages.map((msg, idx) => ({
    id: `msg-${idx}`,
    content: msg.content,
    role: msg.role,
    _original: msg,
  }));

  const rankedOlder = rankMessageImportance(messagesWithIds, opts.trackedEntities);

  // Sort by importance (descending) for greedy selection
  rankedOlder.sort((a, b) => b.importance - a.importance);

  // Select highest-importance older messages until budget exhausted
  const selectedOlder: Message[] = [];
  let usedTokens = 0;

  for (const ranked of rankedOlder) {
    // Find original message by id
    const msgWithId = messagesWithIds.find(m => m.id === ranked.id);
    if (!msgWithId) continue;

    const message = msgWithId._original;
    const messageTokens = getIndividualMessageTokens(message);
    if (usedTokens + messageTokens <= remainingBudget) {
      selectedOlder.push(message);
      usedTokens += messageTokens;
    }
  }

  // Sort selected older messages back into chronological order
  selectedOlder.sort((a, b) => {
    const indexA = olderMessages.indexOf(a);
    const indexB = olderMessages.indexOf(b);
    return indexA - indexB;
  });

  // Identify messages that will be summarized (not selected from older)
  const summarizedMessages = olderMessages.filter(
    (msg) => !selectedOlder.includes(msg)
  );

  // Combine selected older messages with recent messages
  const finalMessages = [...selectedOlder, ...recentMessages];
  const finalTokens = getTotalMessageTokens(finalMessages);

  return {
    selectedMessages: finalMessages,
    summarizedMessages,
    summary: null, // Caller will populate this after summarization
    totalTokens: finalTokens,
    strategy: 'importance_based_selection',
  };
}

/**
 * Extracts important entities from messages for tracking.
 *
 * Identifies:
 * - Capitalized words (likely proper nouns, class names)
 * - Code identifiers (camelCase, snake_case)
 * - File paths (contains / or \)
 *
 * @param messages - Messages to extract entities from
 * @returns Set of unique entities
 *
 * @example
 * ```typescript
 * const entities = extractEntities(messages);
 * // entities = Set(['UserAuth', 'validateToken', 'src/auth/index.ts'])
 * ```
 */
export function extractEntities(messages: Message[]): Set<string> {
  const entities = new Set<string>();

  for (const message of messages) {
    const content = message.content + (message.reasoning_steps || '');

    // Extract capitalized words (likely proper nouns, class names)
    const capitalizedWords = content.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [];
    capitalizedWords.forEach((word) => {
      if (word.length > 2) entities.add(word); // Skip short words like "I", "A"
    });

    // Extract code identifiers (camelCase, snake_case)
    const codeIdentifiers =
      content.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g) || []; // camelCase
    const snakeIdentifiers = content.match(/\b[a-z_]+[a-z0-9_]*\b/g) || []; // snake_case
    [...codeIdentifiers, ...snakeIdentifiers].forEach((id) => {
      if (id.length > 3 && !id.startsWith('_')) entities.add(id);
    });

    // Extract file paths
    const filePaths = content.match(/[\w\-./\\]+\.(ts|tsx|js|jsx|py|java|go|rs|cpp|c|h)/g) || [];
    filePaths.forEach((path) => entities.add(path));
  }

  return entities;
}
