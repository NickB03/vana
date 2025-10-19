/**
 * ADK Streaming Module - Phase 3 Frontend Integration
 *
 * Main export file for ADK event parsing and content extraction.
 *
 * Usage:
 * ```typescript
 * import { parseAdkEventSSE, extractFunctionResponseText } from '@/lib/streaming/adk';
 *
 * const result = parseAdkEventSSE(sseData);
 * if (result.success) {
 *   const event = result.event;
 *   // Process event
 * }
 * ```
 */

// Type exports
export type {
  AdkEvent,
  AdkContent,
  AdkPart,
  AdkTextPart,
  AdkFunctionCall,
  AdkFunctionResponse,
  AdkCodeExecutionResult,
  AdkEventActions,
  ParsedAdkEvent,
  NormalizeResult,
} from './types';

// Type guard exports
export {
  isTextPart,
  isFunctionCallPart,
  isFunctionResponsePart,
  isCodeExecutionResultPart,
  isValidAdkEvent,
} from './types';

// Parser exports
export {
  parseAdkEventSSE,
  normalizeAdkEvent,
  batchParseAdkEvents,
  parseSSEEventBlock,
  isAdkEventData,
  fastParseAdkEvent,
} from './parser';

// Content extractor exports
export {
  extractTextContent,
  extractFunctionCalls,
  extractFunctionResponses,
  extractFunctionResponseText,
  extractSourcesFromFunctionResponse,
  extractAllContent,
  hasContent,
} from './content-extractor';
