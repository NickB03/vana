/**
 * ADK Event Parser - Phase 3 Frontend Integration
 *
 * Main parsing logic for canonical ADK Event payloads.
 * Handles SSE data streams from /run_sse endpoint.
 *
 * Performance Target: <5ms per event parsing
 * Error Handling: Graceful fallback on malformed events
 *
 * Usage:
 * ```typescript
 * const parsed = parseAdkEventSSE(sseData);
 * if (parsed.success) {
 *   // Process parsed.event
 * }
 * ```
 */

import type {
  AdkEvent,
  ParsedAdkEvent,
  NormalizeResult,
} from './types';
import { isValidAdkEvent } from './types';
import {
  extractTextContent,
  extractFunctionCalls,
  extractFunctionResponses,
  extractSources,
  hasContent,
} from './content-extractor';

/**
 * Parse ADK Event from SSE data string
 *
 * This is the main entry point for parsing SSE events.
 * Handles JSON parsing and validation before normalization.
 *
 * @param data - Raw SSE data string (JSON)
 * @param eventType - Optional SSE event type (e.g., 'message', 'agent_update')
 * @returns Normalization result with parsed event or error
 */
export function parseAdkEventSSE(
  data: string,
  eventType?: string
): NormalizeResult {
  try {
    // Trim and validate input
    const trimmedData = data.trim();

    if (!trimmedData) {
      return {
        success: false,
        error: 'Empty SSE data',
      };
    }

    // Handle [DONE] termination marker
    if (trimmedData === '[DONE]') {
      return {
        success: false,
        error: 'Stream complete marker',
      };
    }

    // Handle SSE comments
    if (trimmedData.startsWith(':')) {
      return {
        success: false,
        error: 'SSE comment',
      };
    }

    // Parse JSON
    let rawEvent: unknown;
    try {
      rawEvent = JSON.parse(trimmedData);
    } catch (parseError) {
      console.warn('[ADK Parser] JSON parse error:', {
        error: parseError,
        dataPreview: trimmedData.substring(0, 100),
      });
      return {
        success: false,
        error: 'Invalid JSON',
      };
    }

    // Validate ADK Event structure
    if (!isValidAdkEvent(rawEvent)) {
      console.warn('[ADK Parser] Invalid ADK Event structure:', {
        hasId: !!(rawEvent as any)?.id,
        hasAuthor: !!(rawEvent as any)?.author,
        hasInvocationId: !!(rawEvent as any)?.invocationId,
        dataPreview: JSON.stringify(rawEvent).substring(0, 200),
      });
      return {
        success: false,
        error: 'Invalid ADK Event structure',
      };
    }

    // Normalize event
    const parsedEvent = normalizeAdkEvent(rawEvent, eventType);

    return {
      success: true,
      event: parsedEvent,
    };
  } catch (error) {
    console.error('[ADK Parser] Unexpected parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Normalize ADK Event into ParsedAdkEvent
 *
 * Extracts and pre-processes event content for efficient rendering.
 * This function does the heavy lifting of content extraction.
 *
 * @param rawEvent - Validated ADK Event
 * @param eventType - Optional SSE event type
 * @returns Parsed ADK event with extracted content
 */
export function normalizeAdkEvent(
  rawEvent: AdkEvent,
  eventType?: string
): ParsedAdkEvent {
  // Extract content using content-extractor utilities
  const { textParts, thoughtParts } = extractTextContent(rawEvent);
  const functionCalls = extractFunctionCalls(rawEvent);
  const functionResponses = extractFunctionResponses(rawEvent);
  const sources = extractSources(rawEvent);

  // Detect agent transfers
  const isAgentTransfer = !!rawEvent.actions?.transfer_to_agent;
  const transferTargetAgent = rawEvent.actions?.transfer_to_agent;

  // Determine if this is a final response
  // Based on ADK Event.is_final_response() logic:
  // - No function calls pending
  // - No function responses pending
  // - Not marked as partial
  // - No long-running tools
  const isFinalResponse =
    !rawEvent.partial &&
    functionCalls.length === 0 &&
    !rawEvent.longRunningToolIds &&
    !rawEvent.actions?.skip_summarization;

  return {
    rawEvent,
    messageId: rawEvent.id,
    author: rawEvent.author,
    textParts,
    thoughtParts,
    functionCalls,
    functionResponses,
    sources,
    isAgentTransfer,
    transferTargetAgent,
    isFinalResponse,
  };
}

/**
 * Batch parse multiple SSE events
 *
 * Useful for processing buffered SSE data.
 *
 * @param dataArray - Array of SSE data strings
 * @returns Array of normalization results
 */
export function batchParseAdkEvents(
  dataArray: string[]
): NormalizeResult[] {
  return dataArray.map((data) => parseAdkEventSSE(data));
}

/**
 * Parse SSE event block with metadata
 *
 * Handles SSE format with event:, id:, and data: fields.
 *
 * Example SSE block:
 * ```
 * event: message
 * id: evt_123
 * data: {"id":"evt_123","author":"plan_generator",...}
 * ```
 *
 * @param eventBlock - Raw SSE event block string
 * @returns Normalization result
 */
export function parseSSEEventBlock(eventBlock: string): NormalizeResult {
  const lines = eventBlock.split('\n');
  let eventType: string | undefined;
  let eventId: string | undefined;
  const dataLines: string[] = [];

  // Parse SSE fields
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('event:')) {
      const extractedType = line.slice(6).trim();
      if (extractedType) {
        eventType = extractedType;
      }
    } else if (line.startsWith('id:')) {
      eventId = line.slice(3).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  // Validate we have data
  if (dataLines.length === 0) {
    return {
      success: false,
      error: 'No data in SSE event block',
    };
  }

  // Join multi-line data
  const payload = dataLines.join('\n');

  // Parse ADK event
  return parseAdkEventSSE(payload, eventType);
}

/**
 * Check if SSE data string is an ADK event
 *
 * Quick validation without full parsing.
 * Useful for router logic to detect event format.
 *
 * @param data - Raw SSE data string
 * @returns True if data appears to be an ADK event
 */
export function isAdkEventData(data: string): boolean {
  try {
    const trimmed = data.trim();
    if (!trimmed || trimmed === '[DONE]' || trimmed.startsWith(':')) {
      return false;
    }

    const parsed = JSON.parse(trimmed);

    // Check for ADK event structure
    return !!(
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.id === 'string' &&
      typeof parsed.author === 'string' &&
      typeof parsed.invocationId === 'string'
    );
  } catch {
    return false;
  }
}

/**
 * Performance-optimized parser for high-frequency events
 *
 * Uses minimal validation for speed.
 * Only use when event source is trusted.
 *
 * @param data - Raw SSE data string
 * @returns Parsed event or null
 */
export function fastParseAdkEvent(data: string): ParsedAdkEvent | null {
  try {
    const rawEvent = JSON.parse(data) as AdkEvent;

    // Minimal validation
    if (!rawEvent.id || !rawEvent.author) {
      return null;
    }

    return normalizeAdkEvent(rawEvent);
  } catch {
    return null;
  }
}
