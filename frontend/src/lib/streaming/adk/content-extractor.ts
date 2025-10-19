/**
 * ADK Content Extractor - Phase 3 Frontend Integration
 *
 * Extracts structured content from ADK events:
 * - Text parts (regular text)
 * - Thought parts (agent reasoning)
 * - Function calls (tool invocations)
 * - Function responses (tool results)
 *
 * Performance Target: <2ms per extraction
 *
 * P0-002 FIX: Function response extraction follows canonical path:
 * parts[].functionResponse.response.{result|content|output}
 */

import type {
  AdkEvent,
  AdkPart,
  AdkFunctionCall,
  AdkFunctionResponse,
  isTextPart,
  isFunctionCallPart,
  isFunctionResponsePart,
} from './types';

/**
 * Extract text content from ADK event parts
 *
 * Separates regular text from thoughts for proper UI rendering.
 *
 * @param event - ADK Event to extract from
 * @returns Object with textParts and thoughtParts arrays
 */
export function extractTextContent(event: AdkEvent): {
  textParts: string[];
  thoughtParts: string[];
} {
  const textParts: string[] = [];
  const thoughtParts: string[] = [];

  if (!event.content?.parts) {
    return { textParts, thoughtParts };
  }

  for (const part of event.content.parts) {
    if ('text' in part && part.text) {
      if (part.thought) {
        thoughtParts.push(part.text);
      } else {
        textParts.push(part.text);
      }
    }
  }

  return { textParts, thoughtParts };
}

/**
 * Extract function calls from ADK event parts
 *
 * @param event - ADK Event to extract from
 * @returns Array of function call objects
 */
export function extractFunctionCalls(event: AdkEvent): AdkFunctionCall[] {
  const functionCalls: AdkFunctionCall[] = [];

  if (!event.content?.parts) {
    return functionCalls;
  }

  for (const part of event.content.parts) {
    if ('functionCall' in part && part.functionCall) {
      functionCalls.push(part.functionCall);
    }
  }

  return functionCalls;
}

/**
 * Extract function responses from ADK event parts
 *
 * P0-002 FIX: Extracts from canonical path:
 * parts[].functionResponse.response.{result|content|output}
 *
 * Backend streaming proxy preserves full response structure.
 *
 * @param event - ADK Event to extract from
 * @returns Array of function response objects
 */
export function extractFunctionResponses(event: AdkEvent): AdkFunctionResponse[] {
  const functionResponses: AdkFunctionResponse[] = [];

  if (!event.content?.parts) {
    return functionResponses;
  }

  for (const part of event.content.parts) {
    if ('functionResponse' in part && part.functionResponse) {
      functionResponses.push(part.functionResponse);
    }
  }

  return functionResponses;
}

/**
 * Extract readable text from function response
 *
 * P0-002 FIX: Follows canonical extraction pattern:
 * 1. Check response.result (most common)
 * 2. Check response.content (alternative)
 * 3. Check response.output (legacy)
 * 4. Fallback to stringified response
 *
 * @param functionResponse - Function response object
 * @returns Human-readable string representation
 */
export function extractFunctionResponseText(functionResponse: AdkFunctionResponse): string {
  const response = functionResponse.response;

  // P0-002 FIX: Canonical extraction paths
  if (response.result !== undefined) {
    if (typeof response.result === 'string') {
      return response.result;
    }
    return JSON.stringify(response.result, null, 2);
  }

  if (response.content !== undefined) {
    if (typeof response.content === 'string') {
      return response.content;
    }
    return JSON.stringify(response.content, null, 2);
  }

  if (response.output !== undefined) {
    if (typeof response.output === 'string') {
      return response.output;
    }
    return JSON.stringify(response.output, null, 2);
  }

  // Fallback: stringify entire response
  try {
    return JSON.stringify(response, null, 2);
  } catch (error) {
    return '[Function response could not be serialized]';
  }
}

/**
 * Extract sources from function responses (e.g., web search results)
 *
 * Looks for common source fields in function response data.
 *
 * @param functionResponse - Function response object
 * @returns Array of source objects with title and url
 */
export function extractSourcesFromFunctionResponse(
  functionResponse: AdkFunctionResponse
): Array<{ title: string; url: string }> {
  const sources: Array<{ title: string; url: string }> = [];
  const response = functionResponse.response;

  // Try common source field names
  const possibleSourceFields = ['sources', 'results', 'citations', 'references'];

  for (const field of possibleSourceFields) {
    const data = response[field];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          const title = item.title || item.name || item.text || 'Untitled';
          const url = item.url || item.link || item.href;

          if (url && typeof url === 'string') {
            sources.push({
              title: typeof title === 'string' ? title : String(title),
              url,
            });
          }
        }
      }

      // If we found sources, return them
      if (sources.length > 0) {
        return sources;
      }
    }
  }

  return sources;
}

/**
 * Extract all content from ADK event
 *
 * Convenience function that extracts all content types at once.
 *
 * @param event - ADK Event to extract from
 * @returns Object with all extracted content
 */
export function extractAllContent(event: AdkEvent) {
  const { textParts, thoughtParts } = extractTextContent(event);
  const functionCalls = extractFunctionCalls(event);
  const functionResponses = extractFunctionResponses(event);

  return {
    textParts,
    thoughtParts,
    functionCalls,
    functionResponses,
  };
}

/**
 * Check if event has any meaningful content
 *
 * @param event - ADK Event to check
 * @returns True if event contains text, thoughts, or function calls/responses
 */
export function hasContent(event: AdkEvent): boolean {
  if (!event.content?.parts || event.content.parts.length === 0) {
    return false;
  }

  return event.content.parts.some((part) => {
    if ('text' in part && part.text?.trim()) {
      return true;
    }
    if ('functionCall' in part) {
      return true;
    }
    if ('functionResponse' in part) {
      return true;
    }
    return false;
  });
}
