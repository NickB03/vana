/**
 * Tool Executor Service
 *
 * Executes tool calls from GLM-4.6 and returns formatted results.
 * Supports browser.search, generate_artifact, and generate_image tools.
 *
 * Key Features:
 * - Routes tool calls to appropriate handlers
 * - Wraps Tavily client for web search
 * - Integrates artifact generation via GLM-4.6
 * - Integrates image generation via Gemini Flash Image
 * - Formats results in GLM's expected format
 * - Logs tool execution for analytics
 * - Handles errors gracefully without throwing
 *
 * Usage:
 * ```typescript
 * const result = await executeTool(toolCall, {
 *   requestId: "abc123",
 *   userId: "user-id",
 *   isGuest: false,
 *   supabaseClient: supabase
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
import { rewriteSearchQuery } from './query-rewriter.ts';
import { executeArtifactGeneration, isValidArtifactType, type GeneratableArtifactType } from './artifact-executor.ts';
import { executeImageGeneration, isValidImageMode, type ImageMode } from './image-executor.ts';
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

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
  /** Supabase client for image storage operations */
  supabaseClient?: SupabaseClient;
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
    // Search tool fields
    /** Raw Tavily search results */
    searchResults?: TavilySearchResponse;
    /** Formatted context string for LLM injection */
    formattedContext?: string;
    /** Number of sources found */
    sourceCount?: number;
    // Artifact generation fields
    /** Generated artifact code */
    artifactCode?: string;
    /** Type of artifact generated */
    artifactType?: string;
    /** Title for the artifact */
    artifactTitle?: string;
    /** Reasoning text from GLM */
    artifactReasoning?: string;
    // Image generation fields
    /** Base64 data URL for immediate display */
    imageData?: string;
    /** Storage URL or base64 fallback */
    imageUrl?: string;
    /** Whether storage upload succeeded */
    storageSucceeded?: boolean;
    /** Whether operating in degraded mode (storage failed) */
    degradedMode?: boolean;
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
 * Includes browser.search, generate_artifact, and generate_image
 */
export const SUPPORTED_TOOLS = ['browser.search', 'generate_artifact', 'generate_image'] as const;
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

      case 'generate_artifact': {
        const typeArg = toolCall.arguments.type;
        const prompt = toolCall.arguments.prompt as string;

        if (!typeArg || typeof typeArg !== 'string') {
          return {
            success: false,
            toolName: toolCall.name,
            error: 'Invalid or missing "type" parameter for generate_artifact',
            latencyMs: Date.now() - startTime
          };
        }

        // SECURITY: Whitelist validation for artifact type
        // Defense-in-depth: Don't trust external input even from AI model
        if (!isValidArtifactType(typeArg)) {
          return {
            success: false,
            toolName: toolCall.name,
            error: `Invalid artifact type: "${typeArg}". Valid types: react, html, svg, code, mermaid, markdown`,
            latencyMs: Date.now() - startTime
          };
        }

        if (!prompt || typeof prompt !== 'string') {
          return {
            success: false,
            toolName: toolCall.name,
            error: 'Invalid or missing "prompt" parameter for generate_artifact',
            latencyMs: Date.now() - startTime
          };
        }

        return await executeArtifactTool(typeArg, prompt, context);
      }

      case 'generate_image': {
        const prompt = toolCall.arguments.prompt as string;
        const modeArg = toolCall.arguments.mode as string | undefined;
        const baseImage = toolCall.arguments.baseImage as string | undefined;

        if (!prompt || typeof prompt !== 'string') {
          return {
            success: false,
            toolName: toolCall.name,
            error: 'Invalid or missing "prompt" parameter for generate_image',
            latencyMs: Date.now() - startTime
          };
        }

        // SECURITY: Validate mode parameter with default fallback
        // Defense-in-depth: Validate even with default value
        const mode: ImageMode = modeArg && isValidImageMode(modeArg) ? modeArg : 'generate';

        if (modeArg && !isValidImageMode(modeArg)) {
          console.warn(
            `[${requestId}] ⚠️ Invalid image mode "${modeArg}", defaulting to "generate"`
          );
        }

        if (!context.supabaseClient) {
          return {
            success: false,
            toolName: toolCall.name,
            error: 'Supabase client required for image generation',
            latencyMs: Date.now() - startTime
          };
        }

        return await executeImageTool(prompt, mode, baseImage, context);
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

  // Query rewriting: Optimize the search query if beneficial
  // rewriteSearchQuery handles the shouldRewriteQuery check internally
  let searchQuery = query;
  try {
    const rewriteResult = await rewriteSearchQuery(query, { requestId });
    searchQuery = rewriteResult.rewrittenQuery;

    if (rewriteResult.skipped) {
      console.log(`[${requestId}] 📝 Query rewrite skipped: ${rewriteResult.skipReason}`);
    } else if (searchQuery !== query) {
      console.log(
        `[${requestId}] 📝 Query optimized: "${query}" → "${searchQuery}" (${rewriteResult.latencyMs}ms)`
      );
    }
  } catch (rewriteError) {
    // Silently fall back to original query if rewriting fails
    console.warn(`[${requestId}] Query rewrite failed, using original:`, rewriteError);
    searchQuery = query;
  }

  try {
    // Search with retry tracking (using optimized query)
    const { response, retryCount } = await searchTavilyWithRetryTracking(searchQuery, {
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
      query: searchQuery, // The actual query sent to Tavily (possibly rewritten)
      originalQuery: searchQuery !== query ? query : undefined, // Include original if different
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
      query: searchQuery, // The actual query sent to Tavily (possibly rewritten)
      originalQuery: searchQuery !== query ? query : undefined, // Include original if different
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
 * Execute generate_artifact tool using GLM-4.6
 *
 * Generates artifacts (React, HTML, SVG, etc.) using GLM-4.6 thinking mode.
 * Includes validation and auto-fixing of generated code.
 *
 * @param type - Artifact type to generate
 * @param prompt - User's description of what to create
 * @param context - Execution context
 * @returns Tool execution result with artifact code and reasoning
 *
 * @example
 * ```typescript
 * const result = await executeArtifactTool(
 *   "react",
 *   "Create a counter component",
 *   { requestId: "req-123", isGuest: false }
 * );
 * ```
 */
async function executeArtifactTool(
  type: GeneratableArtifactType,
  prompt: string,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { requestId } = context;

  console.log(`[${requestId}] 🎨 Executing generate_artifact: type=${type}`);

  try {
    const result = await executeArtifactGeneration({
      type,
      prompt,
      requestId,
      enableThinking: true // Enable reasoning for better artifacts
    });

    const latencyMs = Date.now() - startTime;

    console.log(
      `[${requestId}] ✅ generate_artifact completed: ${result.artifactCode.length} chars in ${latencyMs}ms`
    );

    // Generate a title from the prompt (first 50 chars or full prompt if shorter)
    const generatedTitle = prompt.length > 50
      ? prompt.substring(0, 47) + '...'
      : prompt;

    return {
      success: true,
      toolName: 'generate_artifact',
      data: {
        artifactCode: result.artifactCode,
        artifactType: type,
        artifactTitle: generatedTitle,
        artifactReasoning: result.reasoning || undefined
      },
      latencyMs
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[${requestId}] ❌ generate_artifact failed after ${latencyMs}ms:`,
      errorMessage
    );

    return {
      success: false,
      toolName: 'generate_artifact',
      error: errorMessage,
      latencyMs
    };
  }
}

/**
 * Execute generate_image tool using Gemini Flash Image
 *
 * Generates or edits images using OpenRouter Gemini Flash Image model.
 * Uploads to Supabase Storage with retry logic and graceful degradation.
 *
 * @param prompt - Image description or edit instructions
 * @param mode - Generation mode (generate or edit)
 * @param baseImage - Base64 image for edit mode (optional)
 * @param context - Execution context
 * @returns Tool execution result with image data and URLs
 *
 * @example
 * ```typescript
 * const result = await executeImageTool(
 *   "A sunset over mountains",
 *   "generate",
 *   undefined,
 *   { requestId: "req-123", userId: "user-456", supabaseClient: supabase }
 * );
 * ```
 */
async function executeImageTool(
  prompt: string,
  mode: ImageMode,
  baseImage: string | undefined,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { requestId, userId, supabaseClient } = context;

  console.log(`[${requestId}] 🖼️ Executing generate_image: mode=${mode}`);

  if (!supabaseClient) {
    const latencyMs = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Supabase client not provided for image generation`);
    return {
      success: false,
      toolName: 'generate_image',
      error: 'Supabase client required for image generation',
      latencyMs
    };
  }

  try {
    const result = await executeImageGeneration({
      prompt,
      mode,
      baseImage,
      requestId,
      userId,
      supabaseClient
    });

    const latencyMs = Date.now() - startTime;

    console.log(
      `[${requestId}] ✅ generate_image completed in ${latencyMs}ms ` +
      `(storage: ${result.storageSucceeded ? 'succeeded' : 'degraded'})`
    );

    return {
      success: true,
      toolName: 'generate_image',
      data: {
        imageData: result.imageData,
        imageUrl: result.imageUrl,
        storageSucceeded: result.storageSucceeded,
        degradedMode: !result.storageSucceeded
      },
      latencyMs
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[${requestId}] ❌ generate_image failed after ${latencyMs}ms:`,
      errorMessage
    );

    return {
      success: false,
      toolName: 'generate_image',
      error: errorMessage,
      latencyMs
    };
  }
}

/**
 * Get the content string for a tool result to send back to GLM.
 *
 * RFC-001: Tool Result Format Refactor
 *
 * This function replaces the unused formatResultForGLM() function and fixes
 * the bug where artifact/image tools fell back to "Tool execution failed".
 *
 * The returned content is plain text (not XML) and will be used in the
 * OpenAI-compatible tool message format:
 * ```json
 * {
 *   "role": "tool",
 *   "tool_call_id": "call_abc123",
 *   "content": "<returned by this function>"
 * }
 * ```
 *
 * @param result - The tool execution result
 * @returns Content string suitable for GLM tool message
 */
export function getToolResultContent(result: ToolExecutionResult): string {
  // Handle errors first
  if (!result.success) {
    return `Error: ${result.error || 'Unknown error occurred'}`;
  }

  switch (result.toolName) {
    case 'browser.search':
      return result.data?.formattedContext || 'No search results found';

    case 'generate_artifact': {
      const code = result.data?.artifactCode || '';
      const reasoning = result.data?.artifactReasoning || '';
      let content = `Artifact generated successfully:\n\n${code}`;
      if (reasoning) {
        content += `\n\nReasoning:\n${reasoning}`;
      }
      return content;
    }

    case 'generate_image': {
      const url = result.data?.imageUrl || '';
      const stored = result.data?.storageSucceeded;
      return `Image generated successfully!\n\nImage URL: ${url}\n\nStorage Status: ${stored ? 'Successfully stored' : 'Using temporary base64 URL'}`;
    }

    default:
      return result.data?.formattedContext || 'Tool completed successfully';
  }
}

/**
 * @deprecated Use getToolResultContent() instead. This function is retained
 * for backward compatibility but its output is only used for logging.
 * RFC-001: Tool Result Format Refactor
 *
 * Format tool execution result for GLM's expected format
 *
 * GLM expects tool results in the following format:
 * ```
 * <tool_result>
 *   <tool_call_id>call_abc123</tool_call_id>
 *   <name>browser.search</name>
 *   <status>success</status>
 *   <result>
 *   [formatted results or error message]
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

  // Success case - format based on tool type
  let content: string;

  switch (result.toolName) {
    case 'browser.search': {
      // Use formatted context for search results
      content = result.data?.formattedContext || 'No search results found';
      break;
    }

    case 'generate_artifact': {
      // NOTE: Content is sanitized once at line 709 (sanitizeXmlValue call)
      // Do NOT sanitize here to avoid double-escaping (< → &lt; → &amp;lt;)
      const artifactCode = result.data?.artifactCode || '';
      const reasoning = result.data?.artifactReasoning || '';

      content = `Artifact generated successfully:\n\n${artifactCode}`;
      if (reasoning) {
        content += `\n\nReasoning:\n${reasoning}`;
      }
      break;
    }

    case 'generate_image': {
      // NOTE: Content is sanitized once at line 709 (sanitizeXmlValue call)
      // Do NOT sanitize here to avoid double-escaping
      const imageUrl = result.data?.imageUrl || '';
      const storageSucceeded = result.data?.storageSucceeded ?? false;

      content = `Image generated successfully!\n\nImage URL: ${imageUrl}\n\nStorage Status: ${storageSucceeded ? 'Successfully stored' : 'Using temporary base64 URL'}`;
      break;
    }

    default: {
      content = result.data?.formattedContext || 'No data returned';
    }
  }

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
