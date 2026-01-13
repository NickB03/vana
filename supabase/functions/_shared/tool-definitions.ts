/**
 * Tool Definitions for Unified Chat Architecture
 *
 * This module defines the canonical tool catalog for the chat system.
 * It provides TypeScript interfaces and Gemini-compatible tool definitions
 * for all supported tools (artifact generation, image generation, web search).
 *
 * SECURITY NOTE: This is a DATA-ONLY module. Security concerns (validation,
 * rate limiting, authentication) are handled by Phase 0 components in the
 * unified chat architecture.
 *
 * @module tool-definitions
 */

import { MODELS } from './config.ts';

/**
 * Represents a parameter definition for a tool.
 * Maps to JSON Schema format for LLM tool calling.
 */
export interface ToolParameter {
  /** JSON Schema type (string, number, boolean, array, object) */
  type: string;
  /** Human-readable description of the parameter */
  description: string;
  /** Enumerated values for the parameter (optional) */
  enum?: string[];
  /** Default value if parameter is not provided (optional) */
  default?: string | number | boolean;
}

/**
 * Execution metadata for routing and configuration.
 * Specifies which handler to use and how to process the tool call.
 */
export interface ToolExecutionMetadata {
  /** Handler identifier (artifact, image, search) */
  handler: 'artifact' | 'image' | 'search';
  /** Model to use for execution (from MODELS constant) */
  model: string;
  /** Whether the tool supports streaming responses */
  streaming: boolean;
}

/**
 * Complete tool definition including parameters and execution metadata.
 * This is the internal format used by the chat system.
 */
export interface ToolDefinition {
  /** Tool name (must match GLM function calling convention) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Parameter definitions keyed by parameter name */
  parameters: Record<string, ToolParameter>;
  /** List of required parameter names */
  required: string[];
  /** Execution metadata for routing and configuration */
  execution: ToolExecutionMetadata;
}

/**
 * Gemini-compatible tool definition format (OpenAI structure).
 * Used when sending tools to the Gemini API via gemini-client.ts.
 *
 * NOTE: This uses the OpenAI-compatible format that Gemini supports via OpenRouter.
 * The structure includes name, description, and parameters as a JSON schema.
 */
export interface GeminiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

/**
 * Canonical tool catalog.
 * Single source of truth for all tool definitions in the system.
 *
 * NOTE: Uses `as const satisfies` for compile-time immutability and type validation.
 */
export const TOOL_CATALOG = {
  generate_artifact: {
    name: 'generate_artifact',
    description: 'Create interactive React components, HTML, SVG, Mermaid diagrams, or code snippets. Use this tool when the user requests visual content, UI components, diagrams, or executable code.',
    parameters: {
      type: {
        type: 'string',
        description: 'Type of artifact to generate',
        enum: ['react', 'html', 'svg', 'code', 'mermaid', 'markdown'],
      },
      prompt: {
        type: 'string',
        description: 'Detailed description of what to generate. Include all requirements, styling preferences, and functionality details.',
      },
    },
    required: ['type', 'prompt'],
    execution: {
      handler: 'artifact',
      model: MODELS.GEMINI_3_FLASH,
      streaming: true,
    },
  },

  generate_image: {
    name: 'generate_image',
    description: `Generate or edit images using AI. Supports two modes:
- GENERATE: Create new images from text descriptions
- EDIT: Modify existing images (remove objects, change colors, add elements, etc.)

For EDIT mode: Set mode="edit" and include baseImage with the URL of the image to modify. The baseImage URL can be found in the previous assistant message that generated the image.`,
    parameters: {
      prompt: {
        type: 'string',
        description: 'For generate mode: Detailed description of the image to create. For edit mode: Description of the changes to make (e.g., "remove the chair", "make the sky more blue", "add a sunset in the background").',
      },
      mode: {
        type: 'string',
        description: 'Operation mode. Use "generate" for new images, "edit" when modifying a previously generated image.',
        enum: ['generate', 'edit'],
        default: 'generate',
      },
      baseImage: {
        type: 'string',
        description: 'Required for edit mode. The URL or base64 data of the image to modify. Find this in the previous image_complete event or assistant message.',
      },
      aspectRatio: {
        type: 'string',
        description: 'Aspect ratio for the generated image',
        enum: ['1:1', '16:9', '9:16'],
        default: '1:1',
      },
    },
    required: ['prompt'],
    execution: {
      handler: 'image',
      model: MODELS.GEMINI_FLASH_IMAGE,
      streaming: false,
    },
  },

  // NOTE: Uses dot notation for namespacing (browser.search) to match Tavily's tool naming convention
  'browser.search': {
    name: 'browser.search',
    description: 'Search the web for current information, news, facts, or data. Use this tool when the user asks about recent events, current data, or information that may have changed since your knowledge cutoff.',
    parameters: {
      query: {
        type: 'string',
        description: 'Search query. Be specific and include relevant keywords for best results.',
      },
    },
    required: ['query'],
    execution: {
      handler: 'search',
      model: 'tavily',
      streaming: false,
    },
  },
} as const satisfies Record<string, ToolDefinition>;

/**
 * Transforms the tool catalog into Gemini-compatible format.
 *
 * This function converts our internal ToolDefinition format to the
 * JSON Schema format expected by Gemini's function calling API.
 *
 * @returns Array of Gemini tool definitions
 *
 * @example
 * ```typescript
 * const tools = getGeminiToolDefinitions();
 * const response = await geminiClient.chat({
 *   messages: [...],
 *   tools: tools,
 * });
 * ```
 */
export function getGeminiToolDefinitions(): readonly GeminiToolDefinition[] {
  return Object.values(TOOL_CATALOG).map((tool): GeminiToolDefinition => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.parameters,
      required: tool.required,
    },
  }));
}

/** Valid tool names from the catalog */
export type ToolName = keyof typeof TOOL_CATALOG;

/**
 * Gets a tool definition by name.
 *
 * @param toolName - Name of the tool to retrieve
 * @returns Tool definition or undefined if not found
 *
 * @example
 * ```typescript
 * const artifactTool = getToolDefinition('generate_artifact');
 * console.log(artifactTool?.execution.handler); // 'artifact'
 * ```
 */
export function getToolDefinition(toolName: string): ToolDefinition | undefined {
  if (toolName in TOOL_CATALOG) {
    return TOOL_CATALOG[toolName as ToolName];
  }
  return undefined;
}

/**
 * Checks if a tool name is valid (type guard).
 *
 * @param toolName - Name of the tool to check
 * @returns True if the tool exists in the catalog
 *
 * @example
 * ```typescript
 * if (isValidTool('generate_artifact')) {
 *   // Tool is valid, proceed with execution
 * }
 * ```
 */
export function isValidTool(toolName: string): toolName is ToolName {
  return toolName in TOOL_CATALOG;
}

/**
 * Gets all tool names from the catalog.
 *
 * @returns Array of tool names
 *
 * @example
 * ```typescript
 * const tools = getAllToolNames();
 * console.log(tools); // ['generate_artifact', 'generate_image', 'browser.search']
 * ```
 */
export function getAllToolNames(): readonly ToolName[] {
  return Object.keys(TOOL_CATALOG) as ToolName[];
}
