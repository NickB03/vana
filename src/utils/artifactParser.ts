import { ArtifactData, ArtifactType } from "@/components/Artifact";

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
  while ((match = artifactRegex.exec(content)) !== null) {
    const [fullMatch, type, title, language, artifactContent] = match;
    
    // Map MIME type to internal type
    const mappedType = mimeTypeMap[type] || type as ArtifactType;
    
    artifacts.push({
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: mappedType,
      title: title,
      content: artifactContent.trim(),
      language: language || undefined,
    });

    // For images, remove artifact tag without placeholder (they render inline separately)
    // For other artifacts, show a subtle placeholder
    if (mappedType === 'image') {
      cleanContent = cleanContent.replace(fullMatch, '');
    } else {
      cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 ${title}*\n\n`);
    }
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

      cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 ${title}*\n\n`);
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

    cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 ${title}*\n\n`);
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

      cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 Markdown Document*\n\n`);
    }
  }

  // Detect SVG code blocks
  const svgCodeBlockRegex = /```svg\n([\s\S]*?)```/g;
  while ((match = svgCodeBlockRegex.exec(content)) !== null) {
    const [fullMatch, svg] = match;
    
    if (!artifacts.some(a => a.content === svg.trim())) {
      artifacts.push({
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "svg",
        title: "SVG Image",
        content: svg.trim(),
        language: "svg",
      });

      cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 SVG Image*\n\n`);
    }
  }

  // Detect Mermaid diagrams
  const mermaidCodeBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  while ((match = mermaidCodeBlockRegex.exec(content)) !== null) {
    const [fullMatch, mermaid] = match;
    
    if (!artifacts.some(a => a.content === mermaid.trim())) {
      artifacts.push({
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "mermaid",
        title: "Mermaid Diagram",
        content: mermaid.trim(),
        language: "mermaid",
      });

      cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 Mermaid Diagram*\n\n`);
    }
  }

  // Detect React/JSX code blocks
  const reactCodeBlockRegex = /```(?:jsx|react)\n([\s\S]*?)```/g;
  while ((match = reactCodeBlockRegex.exec(content)) !== null) {
    const [fullMatch, jsx] = match;
    
    if (!artifacts.some(a => a.content === jsx.trim())) {
      artifacts.push({
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "react",
        title: "React Component",
        content: jsx.trim(),
        language: "jsx",
      });

      cleanContent = cleanContent.replace(fullMatch, `\n\n*📎 React Component*\n\n`);
    }
  }

  return { artifacts, cleanContent };
};
