import { ArtifactType } from "@/components/Artifact";
import { toast } from "sonner";

// Sanitize filename by removing special characters
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Get file extension based on artifact type and language
export function getFileExtension(type: ArtifactType, language?: string): string {
  switch (type) {
    case 'code':
      if (language) {
        const langMap: Record<string, string> = {
          'javascript': 'js',
          'typescript': 'ts',
          'python': 'py',
          'java': 'java',
          'cpp': 'cpp',
          'c': 'c',
          'csharp': 'cs',
          'ruby': 'rb',
          'go': 'go',
          'rust': 'rs',
          'php': 'php',
          'swift': 'swift',
          'kotlin': 'kt',
          'html': 'html',
          'css': 'css',
          'json': 'json',
          'yaml': 'yml',
          'xml': 'xml',
          'sql': 'sql',
          'bash': 'sh',
          'shell': 'sh',
        };
        return langMap[language.toLowerCase()] || 'txt';
      }
      return 'txt';
    case 'html':
      return 'html';
    case 'react':
      return 'jsx';
    case 'svg':
      return 'svg';
    case 'mermaid':
      return 'mmd';
    case 'markdown':
      return 'md';
    case 'image':
      return 'png';
    default:
      return 'txt';
  }
}

// Get MIME type based on file extension
export function getMimeType(extension: string): string {
  const mimeMap: Record<string, string> = {
    'txt': 'text/plain',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'jsx': 'text/javascript',
    'tsx': 'text/typescript',
    'py': 'text/x-python',
    'java': 'text/x-java',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
    'svg': 'image/svg+xml',
    'md': 'text/markdown',
    'mmd': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
  };
  return mimeMap[extension] || 'text/plain';
}

// Export content as a downloadable file
export function exportAsFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to download file');
  }
}

// Copy content to clipboard
export async function exportToClipboard(content: string): Promise<void> {
  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    await navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    // Fallback to older method
    try {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Copied to clipboard');
    } catch (fallbackError) {
      toast.error('Failed to copy to clipboard. Please check permissions.');
    }
  }
}

// Export HTML artifact as standalone file with inline resources
export function exportAsHTML(
  content: string,
  title: string,
  includeCDN: boolean = true,
  injectedCDNs: string = ''
): string {
  const isFullHTML = content.includes("<!DOCTYPE");

  if (isFullHTML) {
    return content;
  }

  const cdnScripts = includeCDN
    ? `<script src="https://cdn.tailwindcss.com"></script>\n  ${injectedCDNs}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${cdnScripts}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

// Export React component with necessary imports
export function exportAsReact(content: string, title: string): string {
  // Check if content already has imports
  const hasReactImport = /import.*from\s+['"]react['"]/.test(content);

  if (hasReactImport) {
    return content;
  }

  // Add React imports if missing
  const reactImports = `import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

${content}`;

  return reactImports;
}

// Export Mermaid diagram as rendered SVG
export async function exportMermaidAsSVG(
  mermaidContent: string,
  title: string
): Promise<string> {
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });

    const id = `mermaid-export-${Date.now()}`;
    const { svg } = await mermaid.render(id, mermaidContent);
    return svg;
  } catch (error) {
    console.error('Mermaid render error:', error);
    throw new Error('Failed to render Mermaid diagram as SVG');
  }
}

// Export multiple artifacts as a ZIP file (requires JSZip library)
export async function exportMultipleAsZip(
  artifacts: Array<{ content: string; filename: string; type?: string }>
): Promise<void> {
  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add each artifact to the ZIP
    artifacts.forEach((artifact) => {
      zip.file(artifact.filename, artifact.content);
    });

    // Generate ZIP file
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'artifacts.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${artifacts.length} artifacts as ZIP`);
  } catch (error) {
    console.error('ZIP export failed:', error);
    toast.error('Failed to create ZIP file. JSZip library may be missing.');
  }
}

// Export artifact with version history as JSON bundle
export function exportWithVersionHistory(
  artifact: { id: string; type: string; title: string; language?: string; content: string },
  versions: Array<{ version_number: number; artifact_content: string; created_at: string }>
): void {
  const bundle = {
    artifact: {
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      language: artifact.language,
      currentContent: artifact.content,
    },
    versions: versions.map((v) => ({
      version: v.version_number,
      content: v.artifact_content,
      title: v.artifact_title,
      createdAt: v.created_at,
    })),
    exportedAt: new Date().toISOString(),
  };

  const filename = sanitizeFilename(`${artifact.title}_versions.json`);
  exportAsFile(JSON.stringify(bundle, null, 2), filename, 'application/json');
}

// Convert image URL to downloadable blob (for images)
export async function exportImageFromURL(
  imageUrl: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  } catch (error) {
    console.error('Image export failed:', error);
    toast.error('Failed to download image');
  }
}
