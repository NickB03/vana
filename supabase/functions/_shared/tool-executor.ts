/**
 * Tool Executor Service
 *
 * Executes tool calls from GLM-4.6 and returns formatted results.
 * Currently supports browser.search (Tavily web search).
 *
 * Key Features:
 * - Routes tool calls to appropriate handlers
 * - Wraps Tavily client for web search
 * - Formats results in GLM's expected format
 * - Logs tool execution for analytics
 * - Handles errors gracefully without throwing
 *
 * Usage:
 * ```typescript
 * const result = await executeTool(toolCall, {
 *   requestId: "abc123",
 *   userId: "user-id",
 *   isGuest: false
 * });
 *
 * if (result.success) {
 *   const formattedResult = formatResultForGLM(toolCall.name, result);
 *   // Inject into GLM context
 * }
 * ```
 */

import {
  searchTavilyWithRetryTracking,
  formatSearchContext,
  calculateTavilyCost,
  logTavilyUsage,
  type TavilySearchResponse
} from './tavily-client.ts';
import type { ToolCall } from './glm-client.ts';
import { sanitizeXmlValue } from './glm-tool-parser.ts';

/**
 * Context for tool execution
 * Provides necessary metadata for logging and tracking
 */
export interface ToolContext {
  /** Request ID for tracing */
  requestId: string;
  /** User ID for usage tracking (optional for guests) */
  userId?: string;
  /** Whether the user is a guest */
  isGuest: boolean;
  /** Function name for logging (e.g., 'chat', 'generate-artifact') */
  functionName?: string;
}

/**
 * Result of tool execution
 * Contains success/failure status and result data
 */
export interface ToolExecutionResult {
  /** Whether the tool execution succeeded */
  success: boolean;
  /** Name of the tool that was executed */
  toolName: string;
  /** Result data (if successful) */
  data?: {
    /** Raw Tavily search results */
    searchResults?: TavilySearchResponse;
    /** Formatted context string for LLM injection */
    formattedContext?: string;
    /** Number of sources found */
    sourceCount?: number;
  };
  /** Error message (if failed) */
  error?: string;
  /** Execution time in milliseconds */
  latencyMs: number;
  /** Number of retries that occurred */
  retryCount?: number;
}

/**
 * Supported tool names
 * Currently only browser.search is supported
 */
export const SUPPORTED_TOOLS = ['browser.search'] as const;
export type SupportedTool = typeof SUPPORTED_TOOLS[number];

/**
 * Check if a tool name is supported
 *
 * @param toolName - Name of the tool to check
 * @returns True if the tool is supported
 */
function isSupportedTool(toolName: string): toolName is SupportedTool {
  return SUPPORTED_TOOLS.includes(toolName as SupportedTool);
}

/**
 * Execute a tool call from GLM-4.6
 *
 * Routes the tool call to the appropriate handler based on tool name.
 * Logs execution for analytics and handles errors gracefully.
 *
 * @param toolCall - Parsed tool call from GLM response
 * @param context - Execution context with requestId, userId, etc.
 * @returns Tool execution result with success/failure status
 *
 * @example
 * ```typescript
 * const result = await executeTool(
 *   {
 *     id: "call_abc123",
 *     name: "browser.search",
 *     arguments: { query: "latest AI news" }
 *   },
 *   {
 *     requestId: "req-123",
 *     userId: "user-456",
 *     isGuest: false,
 *     functionName: "chat"
 *   }
 * );
 *
 * if (result.success) {
 *   console.log(`Found ${result.data?.sourceCount} sources`);
 * }
 * ```
 */
export async function executeTool(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { requestId, functionName = 'unknown' } = context;

  console.log(
    `[${requestId}] 🔧 Executing tool: ${toolCall.name} (id: ${toolCall.id})`
  );

  // Validate tool is supported
  if (!isSupportedTool(toolCall.name)) {
    const latencyMs = Date.now() - startTime;
    console.error(
      `[${requestId}] ❌ Unsupported tool: ${toolCall.name}. Supported: ${SUPPORTED_TOOLS.join(', ')}`
    );

    return {
      success: false,
      toolName: toolCall.name,
      error: `Unsupported tool: ${toolCall.name}. Supported tools: ${SUPPORTED_TOOLS.join(', ')}`,
      latencyMs
    };
  }

  // Route to appropriate tool handler
  try {
    switch (toolCall.name) {
      case 'browser.search': {
        const query = toolCall.arguments.query as string;
        if (!query || typeof query !== 'string') {
          return {
            success: false,
            toolName: toolCall.name,
            error: 'Invalid or missing "query" parameter for browser.search',
            latencyMs: Date.now() - startTime
          };
        }

        return await executeSearchTool(query, context);
      }

      default: {
        // TypeScript exhaustiveness check - should never happen
        const _exhaustive: never = toolCall.name;
        return {
          success: false,
          toolName: toolCall.name,
          error: `Tool handler not implemented: ${toolCall.name}`,
          latencyMs: Date.now() - startTime
        };
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[${requestId}] ❌ Tool execution failed for ${toolCall.name}:`,
      errorMessage
    );

    return {
      success: false,
      toolName: toolCall.name,
      error: `Tool execution failed: ${errorMessage}`,
      latencyMs
    };
  }
}

/**
 * Execute browser.search tool using Tavily
 *
 * Searches the web using Tavily API and formats results for LLM consumption.
 * Includes retry logic and usage logging.
 *
 * @param query - Search query string
 * @param context - Execution context
 * @returns Tool execution result with search results
 *
 * @example
 * ```typescript
 * const result = await executeSearchTool(
 *   "React 19 features",
 *   { requestId: "req-123", isGuest: false }
 * );
 * ```
 */
async function executeSearchTool(
  query: string,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { requestId, userId, isGuest, functionName = 'tool-executor' } = context;

  console.log(`[${requestId}] 🔍 Executing browser.search: "${query}"`);

  try {
    // Search with retry tracking
    const { response, retryCount } = await searchTavilyWithRetryTracking(query, {
      requestId,
      userId,
      isGuest,
      functionName,
      maxResults: 5, // Limit to 5 results for cost/context efficiency
      searchDepth: 'basic', // Basic depth for faster response
      includeAnswer: true // Include AI-generated summary
    });

    const latencyMs = Date.now() - startTime;

    // Format results for LLM injection
    const formattedContext = formatSearchContext(response, {
      includeUrls: true,
      includeScores: false, // Scores add noise for LLM
      maxResults: 5
    });

    // Log usage to database (fire-and-forget)
    const estimatedCost = calculateTavilyCost('basic');
    logTavilyUsage({
      requestId,
      functionName,
      userId,
      isGuest,
      query,
      resultCount: response.results.length,
      searchDepth: 'basic',
      latencyMs,
      statusCode: 200,
      estimatedCost,
      retryCount
    }).catch(err => {
      console.warn(`[${requestId}] Failed to log Tavily usage:`, err);
    });

    console.log(
      `[${requestId}] ✅ browser.search completed: ${response.results.length} results in ${latencyMs}ms ` +
      `(retries: ${retryCount})`
    );

    return {
      success: true,
      toolName: 'browser.search',
      data: {
        searchResults: response,
        formattedContext,
        sourceCount: response.results.length
      },
      latencyMs,
      retryCount
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[${requestId}] ❌ browser.search failed after ${latencyMs}ms:`,
      errorMessage
    );

    // Log failed attempt (fire-and-forget)
    logTavilyUsage({
      requestId,
      functionName,
      userId,
      isGuest,
      query,
      resultCount: 0,
      searchDepth: 'basic',
      latencyMs,
      statusCode: 500,
      estimatedCost: 0,
      errorMessage,
      retryCount: 0
    }).catch(err => {
      console.warn(`[${requestId}] Failed to log failed Tavily usage:`, err);
    });

    return {
      success: false,
      toolName: 'browser.search',
      error: errorMessage,
      latencyMs
    };
  }
}

/**
 * Format tool execution result for GLM's expected format
 *
 * GLM expects tool results in the following format:
 * ```
 * <tool_result>
 *   <tool_call_id>call_abc123</tool_call_id>
 *   <name>browser.search</name>
 *   <status>success</status>
 *   <result>
 *   [formatted search results or error message]
 *   </result>
 * </tool_result>
 * ```
 *
 * @param toolCall - The original tool call (for id and name)
 * @param result - Tool execution result
 * @returns Formatted string for GLM context injection
 *
 * @example
 * ```typescript
 * const formatted = formatResultForGLM(
 *   { id: "call_123", name: "browser.search", arguments: { query: "test" } },
 *   { success: true, toolName: "browser.search", data: {...}, latencyMs: 500 }
 * );
 * // Returns:
 * // <tool_result>
 * //   <tool_call_id>call_123</tool_call_id>
 * //   <name>browser.search</name>
 * //   <status>success</status>
 * //   <result>
 * //   [formatted search results]
 * //   </result>
 * // </tool_result>
 * ```
 */
export function formatResultForGLM(
  toolCall: ToolCall,
  result: ToolExecutionResult
): string {
  // Error case - inform GLM about the failure
  if (!result.success) {
    const errorMsg = typeof result.error === 'string'
      ? sanitizeXmlValue(result.error)
      : String(result.error);

    return `<tool_result>
  <tool_call_id>${toolCall.id}</tool_call_id>
  <name>${toolCall.name}</name>
  <status>failure</status>
  <result>
Error: ${errorMsg}
  </result>
</tool_result>`;
  }

  // Success case - include formatted context
  const content = result.data?.formattedContext || 'No data returned';
  const sanitizedContent = typeof content === 'string'
    ? sanitizeXmlValue(content)
    : String(content);

  return `<tool_result>
  <tool_call_id>${toolCall.id}</tool_call_id>
  <name>${toolCall.name}</name>
  <status>success</status>
  <result>
${sanitizedContent}
  </result>
</tool_result>`;
}
