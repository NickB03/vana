/**
 * Tool Executor Service
 *
 * Executes tool calls from Gemini 3 Flash and returns formatted results.
 * Supports browser.search, generate_artifact, and generate_image tools.
 *
 * Key Features:
 * - Routes tool calls to appropriate handlers
 * - Wraps Tavily client for web search
 * - Integrates artifact generation via Gemini 3 Flash
 * - Integrates image generation via Gemini Flash Image
 * - Formats results in Gemini's expected format
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
 *   const content = getToolResultContent(result);
 *   // Use content in OpenAI-compatible tool message
 * }
 * ```
 */

import {
  searchTavilyWithRetryTracking,
  formatSearchContext,
  filterSearchResults,
  calculateTavilyCost,
  logTavilyUsage,
  type TavilySearchResponse
} from './tavily-client.ts';
import type { ToolCall } from './gemini-client.ts';
import { detectImageIntent, detectQueryComplexity, rewriteSearchQuery } from './query-rewriter.ts';
import { executeImageGeneration, isValidImageMode, isValidAspectRatio, type ImageMode, type AspectRatio } from './image-executor.ts';
import { generateArtifactStructured } from './artifact-generator-structured.ts';
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { FEATURE_FLAGS } from './config.ts';
import { createLogger } from './logger.ts';
import { validateMaxResults, validateSearchDepth } from './browser-search-params.ts';

/**
 * Artifact type validation and type definition
 *
 * Artifact generation uses structured outputs (JSON schema) via artifact-generator-structured.ts.
 * This provides type-safe artifact data without XML parsing.
 */
const VALID_ARTIFACT_TYPES = ['react', 'html', 'svg', 'code', 'mermaid', 'markdown'] as const;
export type GeneratableArtifactType = typeof VALID_ARTIFACT_TYPES[number];

/**
 * Validate artifact type against whitelist
 */
export function isValidArtifactType(type: string): type is GeneratableArtifactType {
  return VALID_ARTIFACT_TYPES.includes(type as GeneratableArtifactType);
}

/**
 * Helper function to log detailed debug information for premade card failures
 * Only logs when DEBUG_PREMADE_CARDS=true
 */
function logPremadeDebug(requestId: string, message: string, data?: Record<string, unknown>) {
  if (FEATURE_FLAGS.DEBUG_PREMADE_CARDS) {
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    console.log(`[PREMADE-DEBUG][${requestId}] ${message}${logData}`);
  }
}

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
  /** Original user message for template matching in artifact generation */
  userMessage?: string;
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
    /** Reasoning text from Gemini */
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
 * Execute a tool call from Gemini 3 Flash
 *
 * Routes the tool call to the appropriate handler based on tool name.
 * Logs execution for analytics and handles errors gracefully.
 *
 * @param toolCall - Parsed tool call from Gemini response
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

  // Enhanced logging for premade card debugging
  logPremadeDebug(requestId, 'executeTool entry', {
    toolName: toolCall.name,
    toolCallId: toolCall.id,
    argumentKeys: Object.keys(toolCall.arguments),
    arguments: toolCall.arguments,
    contextKeys: Object.keys(context),
  });

  // Validate tool is supported
  if (!isSupportedTool(toolCall.name)) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = `Unsupported tool: ${toolCall.name}. Supported: ${SUPPORTED_TOOLS.join(', ')}`;

    console.error(`[${requestId}] ❌ ${errorMsg}`);

    logPremadeDebug(requestId, 'Tool validation failed - unsupported tool', {
      toolName: toolCall.name,
      supportedTools: SUPPORTED_TOOLS,
      error: errorMsg,
    });

    return {
      success: false,
      toolName: toolCall.name,
      error: errorMsg,
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

        // Extract and validate optional search parameters
        const maxResultsArg = toolCall.arguments.maxResults as number | undefined;
        const searchDepthArg = toolCall.arguments.searchDepth as string | undefined;

        // Use extracted validation functions for testability
        const maxResults = validateMaxResults(maxResultsArg);
        const searchDepth = validateSearchDepth(searchDepthArg);

        return await executeSearchTool(query, context, { maxResults, searchDepth });
      }

      case 'generate_artifact': {
        const typeArg = toolCall.arguments.type;
        const prompt = toolCall.arguments.prompt as string;

        logPremadeDebug(requestId, 'generate_artifact parameter extraction', {
          typeArg,
          typeArgType: typeof typeArg,
          hasPrompt: !!prompt,
          promptType: typeof prompt,
          promptLength: typeof prompt === 'string' ? prompt.length : 0,
        });

        if (!typeArg || typeof typeArg !== 'string') {
          const errorMsg = 'Invalid or missing "type" parameter for generate_artifact';
          logPremadeDebug(requestId, 'generate_artifact validation failed - missing type', {
            typeArg,
            typeArgType: typeof typeArg,
            error: errorMsg,
          });

          return {
            success: false,
            toolName: toolCall.name,
            error: errorMsg,
            latencyMs: Date.now() - startTime
          };
        }

        // SECURITY: Whitelist validation for artifact type
        // Defense-in-depth: Don't trust external input even from AI model
        if (!isValidArtifactType(typeArg)) {
          const errorMsg = `Invalid artifact type: "${typeArg}". Valid types: react, html, svg, code, mermaid, markdown`;
          logPremadeDebug(requestId, 'generate_artifact validation failed - invalid type', {
            typeArg,
            validTypes: ['react', 'html', 'svg', 'code', 'mermaid', 'markdown'],
            error: errorMsg,
          });

          return {
            success: false,
            toolName: toolCall.name,
            error: errorMsg,
            latencyMs: Date.now() - startTime
          };
        }

        if (!prompt || typeof prompt !== 'string') {
          const errorMsg = 'Invalid or missing "prompt" parameter for generate_artifact';
          logPremadeDebug(requestId, 'generate_artifact validation failed - missing prompt', {
            hasPrompt: !!prompt,
            promptType: typeof prompt,
            error: errorMsg,
          });

          return {
            success: false,
            toolName: toolCall.name,
            error: errorMsg,
            latencyMs: Date.now() - startTime
          };
        }

        logPremadeDebug(requestId, 'generate_artifact parameters validated, calling executeArtifactTool', {
          type: typeArg,
          promptLength: prompt.length,
        });

        return await executeArtifactTool(typeArg, prompt, context);
      }

      case 'generate_image': {
        const prompt = toolCall.arguments.prompt as string;
        const modeArg = toolCall.arguments.mode as string | undefined;
        const aspectRatioArg = toolCall.arguments.aspectRatio as string | undefined;
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
          const logger = createLogger({ requestId });
          logger.warn('Invalid image mode, using fallback', {
            invalidMode: modeArg,
            fallbackMode: 'generate',
            toolName: 'generate_image'
          });
        }

        // SECURITY: Validate aspectRatio parameter with default fallback
        const aspectRatio: AspectRatio = aspectRatioArg && isValidAspectRatio(aspectRatioArg) ? aspectRatioArg : '1:1';

        if (aspectRatioArg && !isValidAspectRatio(aspectRatioArg)) {
          const logger = createLogger({ requestId });
          logger.warn('Invalid aspect ratio, using fallback', {
            invalidAspectRatio: aspectRatioArg,
            fallbackAspectRatio: '1:1',
            toolName: 'generate_image'
          });
        }

        if (!context.supabaseClient) {
          return {
            success: false,
            toolName: toolCall.name,
            error: 'Supabase client required for image generation',
            latencyMs: Date.now() - startTime
          };
        }

        return await executeImageTool(prompt, mode, aspectRatio, baseImage, context);
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
 * Search options passed from tool call parameters
 */
interface SearchToolOptions {
  /** Number of results to return (1-10, default 5) */
  maxResults?: number;
  /** Search depth: 'basic' for quick lookups, 'advanced' for deep research */
  searchDepth?: 'basic' | 'advanced';
}

/**
 * Execute browser.search tool using Tavily
 *
 * Searches the web using Tavily API and formats results for LLM consumption.
 * Includes retry logic and usage logging.
 *
 * @param query - Search query string
 * @param context - Execution context
 * @param searchOptions - Optional search parameters from tool call
 * @returns Tool execution result with search results
 *
 * @example
 * ```typescript
 * const result = await executeSearchTool(
 *   "React 19 features",
 *   { requestId: "req-123", isGuest: false },
 *   { maxResults: 5, searchDepth: 'basic' }
 * );
 * ```
 */
async function executeSearchTool(
  query: string,
  context: ToolContext,
  searchOptions?: SearchToolOptions
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
    // Fall back to original query if rewriting fails, but log for visibility
    const logger = createLogger({ requestId });
    const error = rewriteError instanceof Error ? rewriteError : new Error(String(rewriteError));
    logger.error('Query rewrite failed, using original query', error, {
      originalQuery: query,
      toolName: 'browser.search'
    });
    searchQuery = query;
  }

  // Determine search parameters: prefer model-provided values, fall back to auto-detection
  const complexity = detectQueryComplexity(query);
  const includeImages = detectImageIntent(query);

  // Use model-provided searchDepth if specified, otherwise use auto-detected complexity
  const effectiveSearchDepth = searchOptions?.searchDepth ?? complexity.depth;
  // Use model-provided maxResults if specified, otherwise default to 5
  const effectiveMaxResults = searchOptions?.maxResults ?? 5;

  console.log(
    `[${requestId}] 🎯 Search config: depth=${effectiveSearchDepth} (auto-detected: ${complexity.depth}, reason: ${complexity.reason}), maxResults=${effectiveMaxResults}`
  );
  if (includeImages) {
    console.log(`[${requestId}] 🖼️ Image intent detected for search query`);
  }

  try {
    // Search with retry tracking (using optimized query and model-provided parameters)
    const { response, retryCount } = await searchTavilyWithRetryTracking(searchQuery, {
      requestId,
      userId,
      isGuest,
      functionName,
      maxResults: effectiveMaxResults,
      searchDepth: effectiveSearchDepth,
      includeAnswer: true, // Include AI-generated summary
      includeImages
    });

    const latencyMs = Date.now() - startTime;

    const filteredResults = filterSearchResults(response.results, {
      minScore: 0.3,
      maxResults: effectiveMaxResults
    });

    const optimizedResponse = {
      ...response,
      results: filteredResults
    };

    // Format results for LLM injection
    const formattedContext = formatSearchContext(optimizedResponse, {
      includeUrls: true,
      includeScores: false, // Scores add noise for LLM
      maxResults: effectiveMaxResults
    });

    // Log usage to database (fire-and-forget)
    const estimatedCost = calculateTavilyCost(effectiveSearchDepth);
    logTavilyUsage({
      requestId,
      functionName,
      userId,
      isGuest,
      query: searchQuery, // The actual query sent to Tavily (possibly rewritten)
      originalQuery: searchQuery !== query ? query : undefined, // Include original if different
      resultCount: optimizedResponse.results.length,
      searchDepth: effectiveSearchDepth,
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
        searchResults: optimizedResponse,
        formattedContext,
        sourceCount: optimizedResponse.results.length
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
      searchDepth: effectiveSearchDepth,
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
 * Execute generate_artifact tool using structured outputs (JSON schema)
 *
 * Uses Gemini 3 Flash with structured output format:
 * 1. Calls Gemini with JSON schema response format
 * 2. Validates response with Zod schema
 * 3. Returns type-safe artifact data (no XML parsing)
 * 4. Vanilla Sandpack handles rendering and errors
 *
 * @param type - Artifact type to generate
 * @param prompt - User's description of what to create
 * @param context - Execution context
 * @returns Tool execution result with artifact code and metadata
 */
async function executeArtifactTool(
  type: GeneratableArtifactType,
  prompt: string,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const { requestId } = context;

  console.log(`[${requestId}] 🎨 generate_artifact called: type=${type}`);

  logPremadeDebug(requestId, 'executeArtifactTool - using structured generation', {
    type,
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 100),
  });

  // Use structured outputs (JSON schema) for type-safe artifact generation
  console.log(`[${requestId}] 📦 Using structured artifact generation (JSON schema)`);
  return generateArtifactStructured({
    type,
    prompt,
    context,
    existingCode: undefined, // For new artifacts; edits pass existing code via context
  });
}

/**
 * Execute generate_image tool using Gemini Flash Image
 *
 * Generates or edits images using OpenRouter Gemini Flash Image model.
 * Uploads to Supabase Storage with retry logic and graceful degradation.
 *
 * @param prompt - Image description or edit instructions
 * @param mode - Generation mode (generate or edit)
 * @param aspectRatio - Aspect ratio for the image (1:1, 16:9, 9:16)
 * @param baseImage - Base64 image or HTTP URL for edit mode (optional)
 * @param context - Execution context
 * @returns Tool execution result with image data and URLs
 *
 * @example
 * ```typescript
 * const result = await executeImageTool(
 *   "A sunset over mountains",
 *   "generate",
 *   "16:9",
 *   undefined,
 *   { requestId: "req-123", userId: "user-456", supabaseClient: supabase }
 * );
 * ```
 */
async function executeImageTool(
  prompt: string,
  mode: ImageMode,
  aspectRatio: AspectRatio,
  baseImage: string | undefined,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { requestId, userId, supabaseClient } = context;

  console.log(`[${requestId}] 🖼️ Executing generate_image: mode=${mode}, aspectRatio=${aspectRatio}`);

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
    // SECURITY: Validate baseImage for edit mode BEFORE building params
    // Defense-in-depth: Don't pass undefined to image-executor expecting it to catch this
    if (mode === 'edit' && (!baseImage || typeof baseImage !== 'string')) {
      return {
        success: false,
        toolName: 'generate_image',
        error: 'Edit mode requires a valid baseImage parameter (data URL or HTTP URL)',
        latencyMs: Date.now() - startTime
      };
    }

    // Build discriminated union params based on mode
    // Note: baseImage is validated above for edit mode
    const imageParams = mode === "edit"
      ? {
          prompt,
          mode: "edit" as const,
          aspectRatio,
          baseImage: baseImage!, // Safe: validated above for edit mode
          requestId,
          userId,
          supabaseClient
        }
      : {
          prompt,
          mode: "generate" as const,
          aspectRatio,
          requestId,
          userId,
          supabaseClient
        };

    const result = await executeImageGeneration(imageParams);

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
 * Get the content string for a tool result to send back to Gemini.
 *
 * RFC-001: Tool Result Format Refactor
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
      const type = result.data?.artifactType || 'artifact';
      const title = result.data?.artifactTitle || 'Untitled';

      // IMPORTANT: Return a concise summary instead of full code
      // This prompts Gemini to explain what it created to the user
      // The artifact itself is already sent to the client via artifact_complete event
      //
      // CRITICAL: This message MUST trigger the explanation protocol from the system prompt.
      // The system prompt defines the exact format (3-5 sentences, template structure).
      // This tool result just confirms success and triggers the response.
      return `✅ Artifact created successfully: "${title}" (${type})\n\n**YOU MUST NOW RESPOND WITH YOUR EXPLANATION** following the CRITICAL BEHAVIOR RULE #1 from your system instructions. This is NOT optional - explain what you created to the user immediately.`;
    }

    case 'generate_image': {
      // BUG FIX (2025-12-21): Do NOT include base64 data URLs in tool result
      // When storage fails, imageUrl contains 2MB+ of base64 data which overwhelms GLM.
      // The client already received the image via image_complete event.
      //
      // BUG FIX (2026-01-10): Do NOT include the URL in plain text format.
      // The AI model echoes the URL back in markdown format (![...](URL)),
      // which causes duplicate image rendering - one from artifact, one from markdown.
      const url = result.data?.imageUrl || '';
      const stored = result.data?.storageSucceeded;

      // Only include URL if it's a real storage URL (not base64)
      const isBase64 = url.startsWith('data:');

      if (stored && !isBase64) {
        // Storage succeeded - include URL ONLY in system instruction for edit operations
        // The AI model needs this URL for edits, but shouldn't echo it in chat responses
        // IMPORTANT: Prompt Gemini to explain what was created (similar to generate_artifact)
        // CRITICAL: Reference system prompt rules instead of conflicting sentence counts
        return `✅ Image generated successfully and saved to storage. The image is now displayed to the user.\n\n**YOU MUST NOW RESPOND WITH YOUR EXPLANATION** following the CRITICAL BEHAVIOR RULE #1 from your system instructions. Describe what you created including the subject, style, and key visual elements. This is NOT optional.

If the user requests modifications to this image, use generate_image with mode="edit" and baseImage="${url}"`;
      } else {
        // Storage failed - edit mode won't work without a persistent URL
        // IMPORTANT: Prompt Gemini to explain what was created (similar to generate_artifact)
        // CRITICAL: Reference system prompt rules instead of conflicting sentence counts
        return `✅ Image generated successfully. The image is displayed to the user.\n\n**YOU MUST NOW RESPOND WITH YOUR EXPLANATION** following the CRITICAL BEHAVIOR RULE #1 from your system instructions. Describe what you created including the subject, style, and key visual elements. This is NOT optional.

Note: This image was rendered directly (temporary). If the user wants to edit it, a new image will need to be generated instead since the original isn't stored.`;
      }
    }

    default:
      return result.data?.formattedContext || 'Tool completed successfully';
  }
}
