import { ArtifactData, ArtifactType } from "@/components/ArtifactContainer";

// Generate stable artifact ID based on content and type
// Returns a clean, URL-safe identifier using crypto hash
async function generateStableId(content: string, type: ArtifactType, index: number): Promise<string> {
  // Create deterministic hash from content + type + index
  const encoder = new TextEncoder();
  const data = encoder.encode(`${content}${type}${index}`);

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Use first 32 chars of hash for clean, URL-safe ID
    return `artifact-${hashHex.substring(0, 32)}`;
  } catch (error) {
    // Fallback to simple numeric hash if crypto API unavailable
    let hash = 0;
    const str = `${content}${type}${index}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `artifact-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
  }
}

// Detect invalid local imports in artifact content
function detectInvalidImports(content: string, type: ArtifactType): string[] {
  const warnings: string[] = [];

  // Only check React and code artifacts
  if (type !== 'react' && type !== 'code') {
    return warnings;
  }

  // Check for local imports (@/)
  const localImportPattern = /import\s+.*from\s+['"]@\/([^'"]+)['"]/g;
  const matches = content.matchAll(localImportPattern);

  for (const match of matches) {
    const importPath = match[1];
    warnings.push(`Found invalid local import: @/${importPath}`);
  }

  // Check for shadcn/ui specific patterns
  if (/@\/components\/ui\//.test(content)) {
    warnings.push("Found shadcn/ui component imports - these will not work in artifacts");
  }

  if (/@\/lib\/utils/.test(content)) {
    warnings.push("Found @/lib/utils import - cn() function not available in artifacts");
  }

  return warnings;
}

// Map MIME types to internal artifact types
const mimeTypeMap: Record<string, ArtifactType> = {
  'application/vnd.ant.code': 'code',
  'text/markdown': 'markdown',
  'text/html': 'html',
  'image/svg+xml': 'svg',
  'application/vnd.ant.mermaid': 'mermaid',
  'application/vnd.ant.react': 'react',
  'image': 'image',
  // Support standard image MIME types
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/gif': 'image',
  'image/webp': 'image'
};

// Strip markdown code fences from artifact content
function stripMarkdownFences(content: string): string {
  // Remove opening fences: ```jsx, ```typescript, ```javascript, ```html, etc.
  let cleaned = content.replace(/^```[\w]*\n?/gm, '');

  // Remove closing fences: ```
  cleaned = cleaned.replace(/^```\n?$/gm, '');

  return cleaned.trim();
}

/**
 * Detect in-progress (unclosed) artifact tags during streaming.
 * Uses indexOf-based scanning instead of regex for:
 * - Better performance (no regex compilation on each call)
 * - Explicit edge case handling (e.g., <artifactxxx won't match)
 * - Clearer intent in the code
 *
 * @param content - The streaming message content
 * @returns Number of artifact tags that have been opened but not yet closed
 */
export const detectInProgressArtifacts = (content: string): number => {
  let openCount = 0;
  let closeCount = 0;
  let pos = 0;

  // Count valid opening tags: <artifact> or <artifact ...>
  while ((pos = content.indexOf('<artifact', pos)) !== -1) {
    const nextChar = content[pos + 9]; // character after '<artifact'
    // Valid tag must be followed by '>' (self-closing or empty) or ' ' (has attributes)
    // Also accept newline/tab as attribute separator (AI sometimes formats tags across lines)
    if (nextChar === '>' || nextChar === ' ' || nextChar === '\n' || nextChar === '\t') {
      openCount++;
    }
    pos += 9; // Move past '<artifact' to continue searching
  }

  // Count closing tags: </artifact>
  pos = 0;
  while ((pos = content.indexOf('</artifact>', pos)) !== -1) {
    closeCount++;
    pos += 11; // '</artifact>'.length
  }

  return Math.max(0, openCount - closeCount);
};

// Parse message content to extract artifacts
export const parseArtifacts = async (content: string): Promise<{
  artifacts: ArtifactData[];
  cleanContent: string;
  warnings: Array<{ artifactTitle: string; messages: string[] }>;
  inProgressCount: number;
}> => {
  const artifacts: ArtifactData[] = [];
  const warnings: Array<{ artifactTitle: string; messages: string[] }> = [];
  let cleanContent = content;

  // Match artifact blocks - accepts attributes in any order (type, title, language)
  const artifactRegex = /<artifact([^>]*)>([\s\S]*?)<\/artifact>/g;

  let match;
  let artifactIndex = 0;
  const artifactPromises: Promise<void>[] = [];

  while ((match = artifactRegex.exec(content)) !== null) {
    const [fullMatch, attributesStr, artifactContent] = match;

    // Extract attributes from the attribute string (handles any order)
    const typeMatch = attributesStr.match(/type="([^"]+)"/);
    const titleMatch = attributesStr.match(/title="([^"]+)"/);
    const languageMatch = attributesStr.match(/language="([^"]+)"/);

    const type = typeMatch ? typeMatch[1] : '';
    const title = titleMatch ? titleMatch[1] : '';
    const language = languageMatch ? languageMatch[1] : undefined;

    // Map MIME type to internal type
    const mappedType = mimeTypeMap[type] || type as ArtifactType;

    // CRITICAL FIX: Strip markdown code fences before storing
    // AI models sometimes wrap artifact code in ```jsx or ``` blocks
    // This causes "Script error" when trying to execute the fences as JavaScript
    const processedContent = stripMarkdownFences(artifactContent.trim());

    const currentIndex = artifactIndex++;

    // Generate stable ID asynchronously
    artifactPromises.push(
      generateStableId(processedContent, mappedType, currentIndex).then((id) => {
        artifacts.push({
          id,
          type: mappedType,
          title: title,
          content: processedContent,
          language: language || undefined,
        });
      })
    );

    // Check for invalid imports (after fence stripping)
    const importWarnings = detectInvalidImports(processedContent, mappedType);
    if (importWarnings.length > 0) {
      warnings.push({
        artifactTitle: title,
        messages: importWarnings
      });
      console.warn(`Artifact "${title}" has import warnings:`, importWarnings);
    }

    // Remove artifact tags completely - artifacts render as cards now
    cleanContent = cleanContent.replace(fullMatch, '');
  }

  // Wait for all artifact IDs to be generated
  await Promise.all(artifactPromises);

  // Only create artifacts from explicit artifact tags
  // Regular code blocks (```) should be rendered inline with syntax highlighting
  // This prevents treating every code snippet as an artifact

  // Detect in-progress artifacts (streaming)
  const inProgressCount = detectInProgressArtifacts(content);

  return { artifacts, cleanContent, warnings, inProgressCount };
};
