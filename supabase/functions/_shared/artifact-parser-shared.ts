/**
 * Shared Artifact Parser
 *
 * Single source of truth for artifact XML parsing in the BACKEND.
 *
 * NOTE: Frontend (src/utils/artifactParser.ts) maintains its own regex implementation
 * due to browser/Deno runtime incompatibility. These cannot be consolidated.
 * This is intentional - see LLM_MIGRATION_PLAN.md Finding 1.1.
 *
 * @module artifact-parser-shared
 */

/**
 * Regex pattern for extracting artifact content from XML tags.
 * Matches: <artifact type="..." title="...">content</artifact>
 *
 * Groups:
 * - [1]: Attribute string (type="..." title="..." language="...")
 * - [2]: Content between tags
 */
export const ARTIFACT_REGEX = /<artifact([^>]*)>([\s\S]*?)<\/artifact>/gi;

/**
 * Result of parsing an artifact from XML
 */
export interface ArtifactParseResult {
  /** Artifact type (react, html, svg, code, mermaid, markdown) */
  type: string;
  /** Title for the artifact */
  title: string;
  /** The artifact code/content */
  code: string;
  /** Optional language specifier for code artifacts */
  language?: string;
}

/**
 * Extracted attributes from an artifact XML tag
 */
export interface ArtifactAttributes {
  /** Artifact type (react, html, svg, code, mermaid, markdown) */
  type: string;
  /** Title for the artifact */
  title: string;
  /** Optional language specifier */
  language?: string;
}

/**
 * Extract attributes from an artifact tag's attribute string.
 *
 * @param attributeString - The string between <artifact and > (e.g., ' type="react" title="Counter"')
 * @returns Extracted attributes with defaults for missing values
 *
 * @example
 * ```typescript
 * const attrs = extractArtifactAttributes(' type="react" title="My Component"');
 * // { type: 'react', title: 'My Component', language: undefined }
 * ```
 */
export function extractArtifactAttributes(attributeString: string): ArtifactAttributes {
  // Extract individual attributes using regex
  const typeMatch = attributeString.match(/type="([^"]+)"/);
  const titleMatch = attributeString.match(/title="([^"]+)"/);
  const languageMatch = attributeString.match(/language="([^"]+)"/);

  return {
    type: typeMatch?.[1] || 'code',
    title: titleMatch?.[1] || 'Untitled Artifact',
    language: languageMatch?.[1] || undefined
  };
}

/**
 * Strip markdown code fences from artifact content.
 * AI models sometimes wrap artifact code in ```jsx or ``` blocks.
 *
 * @param content - Raw artifact content
 * @returns Content with markdown fences removed
 */
function stripMarkdownFences(content: string): string {
  // Remove opening fences: ```jsx, ```typescript, ```javascript, ```html, etc.
  let cleaned = content.replace(/^```[\w]*\n?/gm, '');

  // Remove closing fences: ```
  cleaned = cleaned.replace(/^```\n?$/gm, '');

  return cleaned.trim();
}

/**
 * Parse an artifact from message content containing XML tags.
 *
 * Extracts the first <artifact> tag found and returns its parsed content.
 * Returns null if no artifact tag is found.
 *
 * @param content - Message content potentially containing artifact XML
 * @returns Parsed artifact result or null if no artifact found
 *
 * @example
 * ```typescript
 * const result = parseArtifactXML(`
 *   <artifact type="react" title="Counter">
 *     export default function App() { return <div>Hello</div>; }
 *   </artifact>
 * `);
 * // { type: 'react', title: 'Counter', code: 'export default...', language: undefined }
 * ```
 */
export function parseArtifactXML(content: string): ArtifactParseResult | null {
  // Reset regex lastIndex for fresh matching (important for global regexes)
  ARTIFACT_REGEX.lastIndex = 0;

  const match = ARTIFACT_REGEX.exec(content);

  if (!match) {
    return null;
  }

  const [, attributeString, rawCode] = match;

  // Extract attributes from the tag
  const attributes = extractArtifactAttributes(attributeString);

  // Strip markdown fences and trim whitespace
  const code = stripMarkdownFences(rawCode);

  return {
    type: attributes.type,
    title: attributes.title,
    code,
    language: attributes.language
  };
}

/**
 * Parse all artifacts from message content containing multiple XML tags.
 *
 * @param content - Message content potentially containing multiple artifact XML tags
 * @returns Array of parsed artifact results (empty if no artifacts found)
 *
 * @example
 * ```typescript
 * const results = parseAllArtifactsXML(`
 *   <artifact type="react" title="Component A">code A</artifact>
 *   <artifact type="html" title="Template B">code B</artifact>
 * `);
 * // [{ type: 'react', ... }, { type: 'html', ... }]
 * ```
 */
export function parseAllArtifactsXML(content: string): ArtifactParseResult[] {
  const results: ArtifactParseResult[] = [];

  // Reset regex lastIndex for fresh matching
  ARTIFACT_REGEX.lastIndex = 0;

  let match;
  while ((match = ARTIFACT_REGEX.exec(content)) !== null) {
    const [, attributeString, rawCode] = match;
    const attributes = extractArtifactAttributes(attributeString);
    const code = stripMarkdownFences(rawCode);

    results.push({
      type: attributes.type,
      title: attributes.title,
      code,
      language: attributes.language
    });
  }

  return results;
}

/**
 * Check if content contains any artifact tags.
 *
 * @param content - Message content to check
 * @returns True if at least one artifact tag is present
 */
export function hasArtifactTags(content: string): boolean {
  // Reset regex lastIndex for fresh matching
  ARTIFACT_REGEX.lastIndex = 0;
  return ARTIFACT_REGEX.test(content);
}
