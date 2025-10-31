import { ArtifactData, ArtifactType } from "@/components/Artifact";

// Generate stable artifact ID based on content and type
function generateStableId(content: string, type: ArtifactType, index: number): string {
  // Create a simple hash from content (first 50 chars + length + type + index)
  const contentSample = content.substring(0, 50).replace(/\s/g, '');
  const hash = `${contentSample}-${content.length}-${type}-${index}`;
  return `artifact-${hash}`;
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
export const parseArtifacts = (content: string): { artifacts: ArtifactData[]; cleanContent: string } => {
  const artifacts: ArtifactData[] = [];
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

    // Remove artifact tags completely - artifacts render as cards now
    cleanContent = cleanContent.replace(fullMatch, '');
  }

  // Only create artifacts from explicit artifact tags
  // Regular code blocks (```) should be rendered inline with syntax highlighting
  // This prevents treating every code snippet as an artifact

  return { artifacts, cleanContent };
};
