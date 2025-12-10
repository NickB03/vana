/**
 * GLM Tool Call Parser
 *
 * Parses GLM-4.6's XML-based tool call format for agentic workflows.
 * Handles streaming detection, multi-tool parsing, and result formatting.
 *
 * Format:
 * ```xml
 * <tool_call>
 *   <name>browser.search</name>
 *   <arguments>
 *     <query>bitcoin price</query>
 *   </arguments>
 * </tool_call>
 * ```
 *
 * @module glm-tool-parser
 */

import type { ToolCall } from './glm-client.ts';

/**
 * Result of parsing content that may contain tool calls
 */
export interface ParsedToolCallResult {
  /** All tool calls found in the content */
  toolCalls: ToolCall[];
  /** Content appearing before the first tool call */
  contentBeforeToolCall: string;
  /** Content appearing after the last tool call */
  contentAfterToolCall: string;
}

/**
 * Regex patterns for tool call detection and parsing
 */
const TOOL_CALL_PATTERN = /<tool_call>([\s\S]*?)<\/tool_call>/g;
const TOOL_NAME_PATTERN = /<name>(.*?)<\/name>/s;
const ARGUMENTS_PATTERN = /<arguments>(.*?)<\/arguments>/s;

/**
 * Parses a single tool call from GLM output
 *
 * @param content - Content that may contain a tool call
 * @returns Parsed tool call or null if invalid/not found
 *
 * @example
 * ```typescript
 * const result = parseToolCall(`
 *   <tool_call>
 *     <name>browser.search</name>
 *     <arguments>
 *       <query>bitcoin price</query>
 *     </arguments>
 *   </tool_call>
 * `);
 * // { id: "...", name: "browser.search", arguments: { query: "bitcoin price" } }
 * ```
 */
export function parseToolCall(content: string): ToolCall | null {
  const toolCalls = parseAllToolCalls(content);
  return toolCalls.length > 0 ? toolCalls[0] : null;
}

/**
 * Extracts ALL tool calls from content (model may invoke multiple tools)
 *
 * @param content - Content containing zero or more tool calls
 * @returns Array of parsed tool calls (empty if none found)
 *
 * @example
 * ```typescript
 * const content = `
 *   <tool_call>
 *     <name>browser.search</name>
 *     <arguments><query>bitcoin</query></arguments>
 *   </tool_call>
 *   <tool_call>
 *     <name>browser.navigate</name>
 *     <arguments><url>https://example.com</url></arguments>
 *   </tool_call>
 * `;
 * const calls = parseAllToolCalls(content);
 * // [{ id: "...", name: "browser.search", ... }, { id: "...", name: "browser.navigate", ... }]
 * ```
 */
export function parseAllToolCalls(content: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const matches = content.matchAll(TOOL_CALL_PATTERN);

  for (const match of matches) {
    const rawXml = match[0];
    const innerContent = match[1].trim();

    try {
      const parsed = parseToolCallInner(innerContent, rawXml);
      if (parsed) {
        toolCalls.push(parsed);
      }
    } catch (error) {
      console.error('[glm-tool-parser] Failed to parse tool call:', {
        rawXml,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue parsing other tool calls even if one fails
    }
  }

  return toolCalls;
}

/**
 * Parses the inner content of a tool call tag
 *
 * @param innerContent - Content between <tool_call> tags
 * @param rawXml - Original XML for logging
 * @returns Parsed tool call or null if invalid
 */
function parseToolCallInner(innerContent: string, rawXml: string): ToolCall | null {
  // Extract tool name from <name> tag
  const toolNameMatch = innerContent.match(TOOL_NAME_PATTERN);
  if (!toolNameMatch) {
    console.warn('[glm-tool-parser] No <name> tag found in tool call:', { rawXml });
    return null;
  }

  const name = toolNameMatch[1].trim();
  if (!name) {
    console.warn('[glm-tool-parser] Empty tool name in tool call:', { rawXml });
    return null;
  }

  // Extract arguments from <arguments> tag
  const argumentsMatch = innerContent.match(ARGUMENTS_PATTERN);
  const argumentsContent = argumentsMatch ? argumentsMatch[1] : "";

  // Parse individual argument tags into object
  const args: Record<string, unknown> = {};

  // Match all XML tags within arguments block: <tag_name>value</tag_name>
  const argMatches = argumentsContent.matchAll(/<(\w+)>(.*?)<\/\1>/gs);
  for (const match of argMatches) {
    const argName = match[1];
    const argValue = match[2].trim();

    // Try to parse as JSON for complex types, otherwise use as string
    try {
      args[argName] = JSON.parse(argValue);
    } catch {
      args[argName] = argValue;
    }
  }

  return {
    id: crypto.randomUUID(), // Generate unique ID for this tool call
    name,
    arguments: args
  };
}

/**
 * Checks if streaming buffer contains a complete tool call
 * Used during SSE streaming to know when to stop buffering and execute
 *
 * @param buffer - Accumulated streaming content
 * @returns True if buffer contains at least one complete </tool_call> tag
 *
 * @example
 * ```typescript
 * let buffer = "<tool_call>\nbrowser.search\n<arg_key>query";
 * isToolCallComplete(buffer); // false
 *
 * buffer += "</arg_key>\n<arg_value>test</arg_value>\n</tool_call>";
 * isToolCallComplete(buffer); // true
 * ```
 */
export function isToolCallComplete(buffer: string): boolean {
  return buffer.includes('</tool_call>');
}

/**
 * Detects if streaming buffer has started a tool call but not completed it
 * Used to determine if we should continue buffering
 *
 * @param buffer - Accumulated streaming content
 * @returns True if buffer contains <tool_call> but no closing tag
 *
 * @example
 * ```typescript
 * hasPartialToolCall("<tool_call>\nbrowser"); // true
 * hasPartialToolCall("Some text"); // false
 * hasPartialToolCall("<tool_call>...</tool_call>"); // false
 * ```
 */
export function hasPartialToolCall(buffer: string): boolean {
  const hasOpenTag = buffer.includes('<tool_call>');
  const hasCloseTag = buffer.includes('</tool_call>');
  return hasOpenTag && !hasCloseTag;
}

/**
 * Parses content and separates tool calls from surrounding text
 *
 * @param content - Full content that may contain tool calls and regular text
 * @returns Structured result with tool calls and surrounding content
 *
 * @example
 * ```typescript
 * const result = parseToolCallsWithContext(`
 *   Let me search for that.
 *   <tool_call>
 *     <name>browser.search</name>
 *     <arguments><query>test</query></arguments>
 *   </tool_call>
 *   I'll analyze the results.
 * `);
 * // {
 * //   toolCalls: [{ id: "...", name: "browser.search", ... }],
 * //   contentBeforeToolCall: "Let me search for that.",
 * //   contentAfterToolCall: "I'll analyze the results."
 * // }
 * ```
 */
export function parseToolCallsWithContext(content: string): ParsedToolCallResult {
  const toolCalls = parseAllToolCalls(content);

  if (toolCalls.length === 0) {
    return {
      toolCalls: [],
      contentBeforeToolCall: content,
      contentAfterToolCall: '',
    };
  }

  // Find first and last tool call positions
  const firstMatch = content.indexOf('<tool_call>');
  const lastMatch = content.lastIndexOf('</tool_call>');

  const contentBeforeToolCall = firstMatch > 0 ? content.substring(0, firstMatch).trim() : '';
  const contentAfterToolCall = lastMatch >= 0 && lastMatch + 12 < content.length
    ? content.substring(lastMatch + 12).trim()
    : '';

  return {
    toolCalls,
    contentBeforeToolCall,
    contentAfterToolCall,
  };
}

/**
 * Formats tool execution result for injection back into GLM conversation
 *
 * @param toolCall - The tool call that was executed (or just tool name string for backward compatibility)
 * @param result - Tool execution result (will be JSON stringified if object)
 * @param success - Whether the tool executed successfully
 * @returns XML-formatted tool result string
 *
 * @example
 * ```typescript
 * const toolCall = { id: "123", name: "browser.search", arguments: { query: "test" } };
 * const xml = formatToolResult(toolCall, { results: [...] }, true);
 * // Returns:
 * // <tool_result>
 * //   <tool_call_id>123</tool_call_id>
 * //   <name>browser.search</name>
 * //   <status>success</status>
 * //   <result>
 * //   {"results":[...]}
 * //   </result>
 * // </tool_result>
 * ```
 */
export function formatToolResult(
  toolCall: ToolCall | string,
  result: unknown,
  success: boolean,
): string {
  const status = success ? 'success' : 'failure';

  // Sanitize string results to prevent XML injection
  const formattedResult = typeof result === 'string'
    ? sanitizeXmlValue(result)
    : JSON.stringify(result, null, 2);

  // Handle backward compatibility with string tool names
  if (typeof toolCall === 'string') {
    const sanitizedToolName = sanitizeXmlValue(toolCall);
    return `<tool_result>
  <name>${sanitizedToolName}</name>
  <status>${status}</status>
  <result>
${formattedResult}
  </result>
</tool_result>`;
  }

  const sanitizedToolName = sanitizeXmlValue(toolCall.name);
  const sanitizedToolId = sanitizeXmlValue(toolCall.id);

  return `<tool_result>
  <tool_call_id>${sanitizedToolId}</tool_call_id>
  <name>${sanitizedToolName}</name>
  <status>${status}</status>
  <result>
${formattedResult}
  </result>
</tool_result>`;
}

/**
 * Formats tool execution error for GLM to understand what went wrong
 *
 * @param toolCall - The tool call that failed (or just tool name string for backward compatibility)
 * @param error - Error message or description
 * @returns XML-formatted error result
 *
 * @example
 * ```typescript
 * const toolCall = { id: "123", name: "browser.navigate", arguments: { url: "invalid" } };
 * const xml = formatToolError(toolCall, 'Invalid URL format');
 * // Returns:
 * // <tool_result>
 * //   <tool_call_id>123</tool_call_id>
 * //   <name>browser.navigate</name>
 * //   <status>error</status>
 * //   <error>
 * //   Invalid URL format
 * //   </error>
 * // </tool_result>
 * ```
 */
export function formatToolError(toolCall: ToolCall | string, error: string): string {
  const sanitizedError = sanitizeXmlValue(error);

  // Handle backward compatibility with string tool names
  if (typeof toolCall === 'string') {
    const sanitizedToolName = sanitizeXmlValue(toolCall);
    return `<tool_result>
  <name>${sanitizedToolName}</name>
  <status>error</status>
  <error>
${sanitizedError}
  </error>
</tool_result>`;
  }

  const sanitizedToolName = sanitizeXmlValue(toolCall.name);
  const sanitizedToolId = sanitizeXmlValue(toolCall.id);

  return `<tool_result>
  <tool_call_id>${sanitizedToolId}</tool_call_id>
  <name>${sanitizedToolName}</name>
  <status>error</status>
  <error>
${sanitizedError}
  </error>
</tool_result>`;
}

/**
 * Validates that a tool call has all required arguments
 *
 * @param toolCall - Parsed tool call to validate
 * @param requiredArgs - Array of required argument names
 * @returns True if all required arguments are present and non-empty
 *
 * @example
 * ```typescript
 * const call = { id: "123", name: "browser.search", arguments: { query: "test" } };
 * validateToolArguments(call, ['query']); // true
 * validateToolArguments(call, ['query', 'limit']); // false (missing 'limit')
 * ```
 */
export function validateToolArguments(
  toolCall: ToolCall,
  requiredArgs: string[],
): boolean {
  for (const arg of requiredArgs) {
    const value = toolCall.arguments[arg];
    // Check if value exists and is non-empty (handle both string and other types)
    if (value === undefined || value === null ||
        (typeof value === 'string' && value.trim() === '')) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitizes XML special characters in tool argument values
 * Use this when constructing tool calls programmatically to avoid XML injection
 *
 * @param value - String value to sanitize
 * @returns Sanitized string safe for XML inclusion
 *
 * @example
 * ```typescript
 * sanitizeXmlValue('Search for <script>alert("xss")</script>');
 * // Returns: 'Search for &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function sanitizeXmlValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Unescapes XML entities in parsed argument values
 * GLM may escape special characters in responses
 *
 * @param value - XML-escaped string
 * @returns Unescaped string
 *
 * @example
 * ```typescript
 * unescapeXmlValue('&lt;script&gt;');
 * // Returns: '<script>'
 * ```
 */
export function unescapeXmlValue(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
