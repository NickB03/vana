/**
 * Streaming Status Utilities
 *
 * Helper functions for extracting meaningful status from various data sources
 * during chat streaming. Part of the robust ticker system design.
 *
 * @see /docs/STATUS_TICKER_DESIGN.md
 */

import type { ToolExecution } from '@/hooks/useChatMessages';

export type StatusSource = 'semantic' | 'tool' | 'reasoning' | 'phase' | 'time';

export type StreamPhase =
  | 'idle'
  | 'receiving'
  | 'reasoning'
  | 'tool_planning'
  | 'tool_executing'
  | 'tool_complete'
  | 'generating'
  | 'finalizing'
  | 'complete';

/**
 * Time-based status thresholds for progressive fallbacks
 */
interface TimeBasedStatus {
  threshold: number; // seconds
  status: string;
}

const TIME_BASED_STATUSES: TimeBasedStatus[] = [
  { threshold: 0, status: '' }, // Use phase status
  { threshold: 3, status: 'Still working on your request...' },
  { threshold: 10, status: 'Building a detailed response...' },
  { threshold: 20, status: 'Crafting a thorough answer...' },
  { threshold: 30, status: 'This is taking longer than usual...' },
  { threshold: 45, status: 'Still processing... Almost there...' },
];

/**
 * Phase-to-status mapping for guaranteed fallbacks
 */
const PHASE_STATUS_MAP: Record<StreamPhase, string> = {
  idle: '',
  receiving: 'Preparing response...',
  reasoning: 'Analyzing your request...',
  tool_planning: 'Planning actions...',
  tool_executing: 'Executing tools...',
  tool_complete: 'Processing results...',
  generating: 'Generating response...',
  finalizing: 'Finalizing response...',
  complete: '',
};

/**
 * Tool-specific in-progress status messages
 */
const TOOL_STATUS_MAP: Record<string, string> = {
  'browser.search': 'Searching the web...',
  'generate_artifact': 'Generating artifact...',
  'generate_image': 'Generating image...',
};

/**
 * Action keyword to status mapping for reasoning text parsing
 */
const ACTION_KEYWORDS: Record<string, string> = {
  search: 'Searching for information...',
  create: 'Creating solution...',
  build: 'Building implementation...',
  analyze: 'Analyzing requirements...',
  design: 'Designing approach...',
  generate: 'Generating content...',
  implement: 'Implementing features...',
  plan: 'Planning approach...',
};

/**
 * Parse elapsed time string (e.g., "45s", "2m 15s") to seconds
 *
 * @param timeStr - Formatted time string from useReasoningTimer
 * @returns Number of elapsed seconds, or 0 if unparseable
 *
 * @example
 * parseElapsedTime("45s")      // 45
 * parseElapsedTime("2m 15s")   // 135
 * parseElapsedTime("3m")       // 180
 * parseElapsedTime("")         // 0
 */
export function parseElapsedTime(timeStr: string | undefined): number {
  if (!timeStr) return 0;

  // Match patterns: "2m 15s", "2m", "45s"
  const parts = timeStr.match(/(\d+)m\s*(\d+)?s?|(\d+)s/);
  if (!parts) return 0;

  if (parts[1]) {
    // "2m 15s" or "2m"
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
    return minutes * 60 + seconds;
  }

  if (parts[3]) {
    // "45s"
    return parseInt(parts[3], 10);
  }

  return 0;
}

/**
 * Get time-based fallback status based on elapsed seconds
 *
 * @param elapsedSeconds - Number of seconds elapsed
 * @returns Time-based status message, or null if under threshold
 *
 * @example
 * getTimeBasedStatus(2)   // null (use phase status)
 * getTimeBasedStatus(5)   // "Still working on your request..."
 * getTimeBasedStatus(15)  // "Building a detailed response..."
 */
export function getTimeBasedStatus(elapsedSeconds: number): string | null {
  // Find the highest threshold that's been crossed
  const applicableStatus = TIME_BASED_STATUSES.filter(
    (s) => elapsedSeconds >= s.threshold
  ).pop();

  return applicableStatus?.status || null;
}

/**
 * Determine current stream phase based on context
 *
 * @param context - Stream context (token count, tool state, artifact state)
 * @returns Current stream phase
 *
 * @example
 * determinePhase({ tokenCount: 10, ... })              // 'reasoning'
 * determinePhase({ tokenCount: 100, toolExecution })   // 'tool_executing'
 * determinePhase({ tokenCount: 600, artifactClosed })  // 'finalizing'
 */
export function determinePhase(context: {
  tokenCount: number;
  toolExecution?: ToolExecution;
  artifactDetected: boolean;
  artifactClosed: boolean;
}): StreamPhase {
  const { tokenCount, toolExecution, artifactDetected, artifactClosed } = context;

  // Tool execution takes precedence
  if (toolExecution) {
    if (toolExecution.success === undefined) return 'tool_executing';
    return 'tool_complete';
  }

  // Token-based progression
  if (tokenCount < 50) return 'reasoning';
  if (tokenCount < 150 && !artifactDetected) return 'generating';
  if (artifactDetected && !artifactClosed) return 'generating';
  if (artifactClosed || tokenCount > 500) return 'finalizing';

  return 'generating';
}

/**
 * Get status message for current stream phase
 *
 * @param phase - Current stream phase
 * @returns Human-readable status message
 */
export function getPhaseStatus(phase: StreamPhase): string {
  return PHASE_STATUS_MAP[phase] || PHASE_STATUS_MAP.generating;
}

/**
 * Get human-readable status from tool execution state
 *
 * @param toolExecution - Current tool execution state
 * @returns Status message, or null if tool state is invalid
 *
 * @example
 * // In progress
 * getToolExecutionStatus({ toolName: 'browser.search', timestamp: ... })
 * // "Searching the web..."
 *
 * // Success with sources
 * getToolExecutionStatus({ toolName: 'browser.search', success: true, sourceCount: 5 })
 * // "Found 5 sources"
 *
 * // Failure
 * getToolExecutionStatus({ toolName: 'browser.search', success: false })
 * // "browser.search failed"
 */
export function getToolExecutionStatus(
  toolExecution: ToolExecution | null | undefined
): string | null {
  if (!toolExecution) return null;

  const { toolName, success, sourceCount } = toolExecution;

  // Result available
  if (success !== undefined) {
    if (success && sourceCount !== undefined) {
      return `Found ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
    }
    return success ? `${toolName} completed` : `${toolName} failed`;
  }

  // In progress - use tool-specific message
  return TOOL_STATUS_MAP[toolName] || `Using ${toolName}...`;
}

/**
 * Extract first sentence from text with length limit
 *
 * @param text - Text to extract from
 * @param maxLength - Maximum length of extracted sentence (default: 40)
 * @returns First sentence, truncated if necessary
 *
 * @example
 * extractFirstSentence("Analyzing the user's question. Then we'll plan.")
 * // "Analyzing the user's question..."
 *
 * extractFirstSentence("This is a very long sentence that exceeds the maximum length", 20)
 * // "This is a very lo..."
 */
export function extractFirstSentence(text: string, maxLength = 40): string {
  // Remove leading whitespace and markdown
  const cleaned = text.trim().replace(/^[#*\s]+/, '');

  // Extract first sentence (period, question mark, exclamation, or newline)
  const firstSentence = cleaned.split(/[.?!\n]/)[0].trim();

  // Truncate if too long
  if (firstSentence.length > maxLength) {
    return firstSentence.substring(0, maxLength - 3) + '...';
  }

  return firstSentence.length > 0 ? firstSentence + '...' : '';
}

/**
 * Detect action keywords in text and return corresponding status
 *
 * @param text - Text to analyze for action keywords
 * @returns Status message if keyword found, null otherwise
 *
 * @example
 * detectThinkingAction("I will search for the answer")
 * // "Searching for information..."
 *
 * detectThinkingAction("Let me build a component for you")
 * // "Building implementation..."
 */
export function detectThinkingAction(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const [keyword, status] of Object.entries(ACTION_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return status;
    }
  }

  return null;
}

/**
 * Parse streaming reasoning text to extract meaningful status
 *
 * Tries multiple strategies in order:
 * 1. Extract markdown bold header (e.g., **Analyzing**)
 * 2. Detect action keywords (e.g., "search", "build")
 * 3. Extract first sentence
 *
 * @param text - Raw reasoning text being streamed
 * @returns Extracted status message, or null if no meaningful status found
 *
 * @example
 * parseReasoningTextForStatus("**Analyzing the Question**\n\nThe user wants...")
 * // "Analyzing the Question..."
 *
 * parseReasoningTextForStatus("I will search for relevant information...")
 * // "Searching for information..."
 *
 * parseReasoningTextForStatus("Planning the implementation. We need...")
 * // "Planning the implementation..."
 */
export function parseReasoningTextForStatus(text: string | null | undefined): string | null {
  if (!text || text.length < 5) return null;

  // Strategy 1: Extract markdown bold header
  const headerMatch = text.match(/\*\*([^*]+)\*\*/);
  if (headerMatch) {
    const header = headerMatch[1].trim();
    return header.length > 30 ? header.substring(0, 27) + '...' : header + '...';
  }

  // Strategy 2: Detect action keywords
  const keywordStatus = detectThinkingAction(text);
  if (keywordStatus) return keywordStatus;

  // Strategy 3: Extract first sentence
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length > 5) {
    return extractFirstSentence(firstLine);
  }

  return null;
}

/**
 * Validate that a status string is meaningful (not generic fallback)
 *
 * @param status - Status string to validate
 * @returns True if status is meaningful, false if generic
 *
 * @example
 * isStatusMeaningful("Analyzing your request")  // true
 * isStatusMeaningful("Thinking...")             // false
 * isStatusMeaningful("")                        // false
 */
export function isStatusMeaningful(status: string | null | undefined): boolean {
  if (!status || status.length === 0) return false;

  const genericStatuses = ['Thinking...', 'Processing...', 'Loading...'];
  return !genericStatuses.includes(status);
}
