import { ArtifactData, ArtifactType } from "@/components/Artifact";

// Generate stable artifact ID based on content and type
function generateStableId(content: string, type: ArtifactType, index: number): string {
  // Create a simple hash from content (first 50 chars + length + type + index)
  const contentSample = content.substring(0, 50).replace(/\s/g, '');
  const hash = `${contentSample}-${content.length}-${type}-${index}`;
  return `artifact-${hash}`;
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

// Parse message content to extract artifacts
export const parseArtifacts = (content: string): {
  artifacts: ArtifactData[];
  cleanContent: string;
  warnings: Array<{ artifactTitle: string; messages: string[] }>;
} => {
  const artifacts: ArtifactData[] = [];
  const warnings: Array<{ artifactTitle: string; messages: string[] }> = [];
  let cleanContent = content;

  // Match artifact blocks - accepts attributes in any order (type, title, language)
  const artifactRegex = /<artifact([^>]*)>([\s\S]*?)<\/artifact>/g;

  let match;
  let artifactIndex = 0;
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

    artifacts.push({
      id: generateStableId(processedContent, mappedType, artifactIndex++),
      type: mappedType,
      title: title,
      content: processedContent,
      language: language || undefined,
    });

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

  // Only create artifacts from explicit artifact tags
  // Regular code blocks (```) should be rendered inline with syntax highlighting
  // This prevents treating every code snippet as an artifact

  return { artifacts, cleanContent, warnings };
};
