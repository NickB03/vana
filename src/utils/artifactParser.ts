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

  // Detect HTML code blocks
  const htmlCodeBlockRegex = /```html\n([\s\S]*?)```/g;
  while ((match = htmlCodeBlockRegex.exec(content)) !== null) {
    const [fullMatch, code] = match;
    
    if (code.includes("<") && code.includes(">") && !artifacts.some(a => a.content === code.trim())) {
      const title = "HTML Preview";
      
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

  // Detect other code blocks (python, javascript, etc.)
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [fullMatch, language, code] = match;
    
    // Skip if already processed as HTML or if it's a duplicate
    if (language === 'html' || artifacts.some(a => a.content === code.trim())) {
      continue;
    }
    
    const languageMap: { [key: string]: string } = {
      python: "Python Code",
      javascript: "JavaScript Code",
      typescript: "TypeScript Code",
      java: "Java Code",
      cpp: "C++ Code",
      c: "C Code",
      go: "Go Code",
      rust: "Rust Code",
      ruby: "Ruby Code",
      php: "PHP Code",
      swift: "Swift Code",
      kotlin: "Kotlin Code",
    };
    
    const title = languageMap[language.toLowerCase()] || `${language} Code`;
    
    artifacts.push({
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "code",
      title: title,
      content: code.trim(),
      language: language,
    });

    cleanContent = cleanContent.replace(fullMatch, `\n\n[View: ${title}]\n\n`);
  }

  // Detect markdown documents
  const markdownBlockRegex = /```markdown\n([\s\S]*?)```/g;
  while ((match = markdownBlockRegex.exec(content)) !== null) {
    const [fullMatch, markdown] = match;
    
    if (!artifacts.some(a => a.content === markdown.trim())) {
      artifacts.push({
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "markdown",
        title: "Markdown Document",
        content: markdown.trim(),
        language: "markdown",
      });

      cleanContent = cleanContent.replace(fullMatch, `\n\n[View: Markdown Document]\n\n`);
    }
  }

  return { artifacts, cleanContent };
};
