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
  'image': 'image'
};

// Parse message content to extract artifacts
export const parseArtifacts = (content: string): {
  artifacts: ArtifactData[];
  cleanContent: string;
  warnings: Array<{ artifactTitle: string; messages: string[] }>;
} => {
  const artifacts: ArtifactData[] = [];
  const warnings: Array<{ artifactTitle: string; messages: string[] }> = [];
  let cleanContent = content;

  // Match artifact blocks with format: <artifact type="..." title="...">content</artifact>
  const artifactRegex = /<artifact\s+type="([^"]+)"\s+title="([^"]+)"(?:\s+language="([^"]+)")?>([\s\S]*?)<\/artifact>/g;

  let match;
  let artifactIndex = 0;
  while ((match = artifactRegex.exec(content)) !== null) {
    const [fullMatch, type, title, language, artifactContent] = match;

    // Map MIME type to internal type
    const mappedType = mimeTypeMap[type] || type as ArtifactType;

    artifacts.push({
      id: generateStableId(artifactContent.trim(), mappedType, artifactIndex++),
      type: mappedType,
      title: title,
      content: artifactContent.trim(),
      language: language || undefined,
    });

    // Check for invalid imports
    const importWarnings = detectInvalidImports(artifactContent.trim(), mappedType);
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
