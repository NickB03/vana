import { ArtifactData, ArtifactType } from "@/components/Artifact";

// Parse message content to extract artifacts
export const parseArtifacts = (content: string): { artifacts: ArtifactData[]; cleanContent: string } => {
  const artifacts: ArtifactData[] = [];
  let cleanContent = content;

  // Match artifact blocks with format: <artifact type="..." title="...">content</artifact>
  const artifactRegex = /<artifact\s+type="([^"]+)"\s+title="([^"]+)"(?:\s+language="([^"]+)")?>([\s\S]*?)<\/artifact>/g;
  
  let match;
  while ((match = artifactRegex.exec(content)) !== null) {
    const [fullMatch, type, title, language, artifactContent] = match;
    
    artifacts.push({
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as ArtifactType,
      title: title,
      content: artifactContent.trim(),
      language: language || undefined,
    });

    // Remove artifact from content
    cleanContent = cleanContent.replace(fullMatch, `\n\n[View: ${title}]\n\n`);
  }

  // Also detect code blocks that might be HTML/web content
  const htmlCodeBlockRegex = /```html\n([\s\S]*?)```/g;
  while ((match = htmlCodeBlockRegex.exec(content)) !== null) {
    const [fullMatch, code] = match;
    
    // Only convert to artifact if it contains HTML structure
    if (code.includes("<") && code.includes(">") && !artifacts.some(a => a.content === code.trim())) {
      const title = code.includes("<h1") ? "HTML Preview" : "Code Preview";
      
      artifacts.push({
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "html",
        title: title,
        content: code.trim(),
        language: "html",
      });

      cleanContent = cleanContent.replace(fullMatch, `\n\n[View: ${title}]\n\n`);
    }
  }

  return { artifacts, cleanContent };
};
