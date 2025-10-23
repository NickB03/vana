/**
 * ADK Event Content Extraction Utilities
 *
 * CRITICAL: ADK events can contain content in multiple locations:
 * 1. Top-level fields: content, report, final_report, result
 * 2. parts[].text - Direct model streaming output
 * 3. parts[].functionResponse - Agent tool outputs (e.g., plan_generator)
 *
 * Research plans and agent outputs come via functionResponse, NOT text!
 * Missing functionResponse extraction breaks the entire research workflow.
 *
 * See: docs/adk/ADK-Event-Extraction-Guide.md
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes content to prevent XSS attacks
 *
 * SECURITY: Always sanitize AI-generated content before rendering
 * Removes dangerous HTML/JS while preserving safe formatting
 *
 * @param content - Raw content from ADK events
 * @returns Sanitized content safe for rendering
 */
function sanitizeContent(content: string): string {
  // Configure DOMPurify to be strict but allow basic formatting
  const config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  };

  return DOMPurify.sanitize(content, config);
}

/**
 * ADK event part types
 */
interface ADKTextPart {
  text: string;
}

interface ADKFunctionResponse {
  id?: string;
  name?: string;
  response?: {
    result?: string;
    [key: string]: any;
  };
}

interface ADKFunctionCall {
  id?: string;
  name?: string;
  args?: Record<string, any>;
}

interface ADKThoughtSignature {
  thinking?: string;
  step?: string;
  [key: string]: any;
}

type ADKPart =
  | ADKTextPart
  | { functionResponse: ADKFunctionResponse }
  | { functionCall: ADKFunctionCall }
  | { thoughtSignature: ADKThoughtSignature };

/**
 * ADK event payload structure (flexible for backward compatibility)
 */
interface ADKEventPayload {
  content?: string;
  report?: string;
  final_report?: string;
  result?: string;
  parts?: ADKPart[];
  [key: string]: unknown;
}

/**
 * Extraction result with metadata
 */
interface ExtractionResult {
  content: string;
  sources: {
    topLevel: boolean;
    textParts: number;
    functionResponses: number;
  };
}

/**
 * Safely extracts string content from various value types
 */
function extractStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'object' && value !== null) {
    // Try to extract meaningful content from objects
    const obj = value as Record<string, unknown>;
    if ('result' in obj && typeof obj.result === 'string') {
      return obj.result.trim() || null;
    }
    if ('text' in obj && typeof obj.text === 'string') {
      return obj.text.trim() || null;
    }
    if ('content' in obj && typeof obj.content === 'string') {
      return obj.content.trim() || null;
    }

    // FIX: Handle ADK content structure with parts[] array
    // When content is an object like {parts: [{text: "..."}], role: "model"}
    if ('parts' in obj && Array.isArray(obj.parts)) {
      const textParts: string[] = [];
      for (const part of obj.parts) {
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          const text = part.text.trim();
          if (text) textParts.push(text);
        }
      }
      if (textParts.length > 0) {
        return textParts.join('\n\n');
      }
      // CRITICAL FIX: If parts array exists but has no text, return null
      // Do NOT fall through to stringify - this prevents raw JSON from being displayed
      // The parts array is the canonical ADK structure, so if it exists but has no
      // extractable text, we've already tried the proper extraction and should not
      // fall back to stringifying internal coordination messages (functionCall, thoughtSignature)
      return null;
    }

    // Last resort: stringify if it looks like meaningful data
    // NOTE: This should only trigger for non-ADK structures (legacy formats)
    const stringified = JSON.stringify(value);
    if (stringified !== '{}' && stringified !== '[]') {
      return stringified;
    }
  }

  return null;
}

/**
 * Extracts content from a functionResponse part
 *
 * CRITICAL: Research plans from plan_generator come via functionResponse!
 * This is the most important extraction path for agent tool outputs.
 */
function extractFromFunctionResponse(
  functionResponse: ADKFunctionResponse
): string | null {
  if (!functionResponse || typeof functionResponse !== 'object') {
    return null;
  }

  const toolName = functionResponse.name || 'unknown';
  const response = functionResponse.response;

  if (!response || typeof response !== 'object') {
    console.warn(
      `[ADK] functionResponse from "${toolName}" has no response field`
    );
    return null;
  }

  // Try to extract result field (most common pattern)
  const result = response.result;
  if (result) {
    const extracted = extractStringValue(result);
    if (extracted) {
      console.debug(
        `[ADK] Extracted functionResponse from "${toolName}": ${extracted.length} chars`
      );
      return extracted;
    }
  }

  // Fallback: check other common content fields (but skip metadata fields like status, error, etc.)
  const contentFields = ['text', 'content', 'message', 'output', 'data'];
  for (const key of contentFields) {
    if (key in response) {
      const value = response[key];
      const extracted = extractStringValue(value);
      if (extracted) {
        console.debug(
          `[ADK] Extracted functionResponse.${key} from "${toolName}": ${extracted.length} chars`
        );
        return extracted;
      }
    }
  }

  console.warn(
    `[ADK] functionResponse from "${toolName}" has no extractable content:`,
    JSON.stringify(response)
  );
  return null;
}

/**
 * Extracts content from ADK event parts array
 *
 * Handles all part types:
 * - text: Direct model output
 * - functionResponse: Agent tool outputs (CRITICAL!)
 * - functionCall: Tool invocations (logged, not extracted)
 * - thoughtSignature: Model reasoning (logged, not extracted)
 */
function extractFromParts(parts: ADKPart[]): {
  content: string[];
  textParts: number;
  functionResponses: number;
} {
  const content: string[] = [];
  let textParts = 0;
  let functionResponses = 0;

  for (const part of parts) {
    if (!part || typeof part !== 'object') {
      continue;
    }

    // 1. Extract text parts (model streaming)
    if ('text' in part && typeof part.text === 'string') {
      const text = part.text.trim();
      if (text) {
        content.push(text);
        textParts++;
        console.debug(`[ADK] Extracted text part: ${text.length} chars`);
      }
    }

    // 2. Extract functionResponse parts (CRITICAL for agent outputs!)
    if ('functionResponse' in part) {
      const extracted = extractFromFunctionResponse(part.functionResponse);
      if (extracted) {
        content.push(extracted);
        functionResponses++;
      }
    }

    // 3. Log functionCall for debugging (don't extract content)
    if ('functionCall' in part) {
      const toolName = part.functionCall?.name || 'unknown';
      console.debug(`[ADK] Tool invocation: ${toolName}`);
    }

    // 4. Log thoughtSignature for debugging (optional to extract)
    if ('thoughtSignature' in part) {
      const thinking = JSON.stringify(part.thoughtSignature).slice(0, 100);
      console.debug(`[ADK] Model thinking: ${thinking}...`);
    }
  }

  return { content, textParts, functionResponses };
}

/**
 * Extracts content from an ADK event payload
 *
 * Extraction order (all are checked, results concatenated):
 * 1. Top-level fields: content, report, final_report, result
 * 2. parts[].text - Model streaming output
 * 3. parts[].functionResponse - Agent tool outputs (CRITICAL!)
 *
 * @param payload - ADK event payload (can be partial/malformed)
 * @param fallbackMessage - Message to return if no content found
 * @returns Extraction result with content and metadata
 *
 * @example
 * // Extract from research_complete event
 * const result = extractContentFromADKEvent(payload, 'Research complete');
 * console.log(result.content); // Extracted content
 * console.log(result.sources); // Metadata about sources
 */
export function extractContentFromADKEvent(
  payload: ADKEventPayload | unknown,
  fallbackMessage: string = 'No content available'
): ExtractionResult {
  const extractedParts: string[] = [];
  let topLevel = false;
  let textParts = 0;
  let functionResponses = 0;

  // Validate payload
  if (!payload || typeof payload !== 'object') {
    console.warn('[ADK] Invalid payload:', payload);
    return {
      content: fallbackMessage,
      sources: { topLevel: false, textParts: 0, functionResponses: 0 },
    };
  }

  try {
    const eventPayload = payload as ADKEventPayload;

    // 1. Check top-level fields
    const topLevelFields = ['content', 'report', 'final_report', 'result'] as const;
    for (const field of topLevelFields) {
      const value = eventPayload[field];
      if (value) {
        const extracted = extractStringValue(value);
        if (extracted) {
          extractedParts.push(extracted);
          topLevel = true;
          console.debug(`[ADK] Extracted top-level "${field}": ${extracted.length} chars`);
          // Don't break - collect all top-level fields
        }
      }
    }

    // 2. Extract from parts array
    if (Array.isArray(eventPayload.parts) && eventPayload.parts.length > 0) {
      const partsResult = extractFromParts(eventPayload.parts);
      extractedParts.push(...partsResult.content);
      textParts = partsResult.textParts;
      functionResponses = partsResult.functionResponses;
    }

    // 3. Return results with deduplication and XSS sanitization
    if (extractedParts.length > 0) {
      // CRITICAL FIX: Deduplicate extracted parts to prevent tripled/duplicated content
      // Backend may send same content in multiple fields (top-level + parts[].functionResponse)
      const uniqueParts = Array.from(new Set(extractedParts));
      const rawContent = uniqueParts.join('\n\n').trim();

      // SECURITY: Sanitize content to prevent XSS attacks
      const content = sanitizeContent(rawContent);

      console.log('[ADK] Extraction complete:', {
        totalParts: extractedParts.length,
        uniqueParts: uniqueParts.length,
        deduplicationApplied: extractedParts.length !== uniqueParts.length,
        totalLength: content.length,
        sanitized: rawContent !== content,
        sources: { topLevel, textParts, functionResponses },
      });

      return {
        content,
        sources: { topLevel, textParts, functionResponses },
      };
    }

    // No content found
    console.warn('[ADK] No content found in payload:', JSON.stringify(payload).slice(0, 200));
    return {
      content: sanitizeContent(fallbackMessage),
      sources: { topLevel: false, textParts: 0, functionResponses: 0 },
    };

  } catch (error) {
    console.error('[ADK] Error extracting content:', error);
    const errorMessage = `Error extracting content: ${error instanceof Error ? error.message : String(error)}`;
    return {
      content: sanitizeContent(errorMessage),
      sources: { topLevel: false, textParts: 0, functionResponses: 0 },
    };
  }
}

/**
 * Validates if an ADK event has extractable content
 */
export function hasExtractableContent(payload: any): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  // Phase 3.3: Check for error field (503 errors, rate limit errors, etc.)
  // Error events should be displayed to users, not silently filtered
  if (payload.error) {
    return true;
  }

  // Check top-level fields
  const topLevelFields = ['content', 'report', 'final_report', 'result'];
  for (const field of topLevelFields) {
    if (payload[field] && extractStringValue(payload[field])) {
      return true;
    }
  }

  // Check parts array
  if (Array.isArray(payload.parts) && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (!part || typeof part !== 'object') continue;

      if ('text' in part && part.text) {
        return true;
      }

      if ('functionResponse' in part && part.functionResponse) {
        return true;
      }
    }
  }

  return false;
}
