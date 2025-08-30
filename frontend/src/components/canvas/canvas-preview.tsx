'use client';

import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface CanvasPreviewProps {
  content: string;
  mode: 'markdown' | 'web';
  className?: string;
}

export function CanvasPreview({ content, mode, className }: CanvasPreviewProps) {
  const previewContent = useMemo(() => {
    if (mode === 'markdown') {
      return renderMarkdown(content);
    } else if (mode === 'web') {
      return renderWebPreview(content);
    }
    return content;
  }, [content, mode]);

  const hasErrors = useMemo(() => {
    if (mode === 'web') {
      return checkWebErrors(content);
    }
    return [];
  }, [content, mode]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Preview Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {mode === 'markdown' ? 'Markdown Preview' : 'Web Preview'}
          </span>
          {hasErrors.length === 0 ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {hasErrors.length} Error{hasErrors.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {hasErrors.length > 0 && (
        <div className="p-3 bg-destructive/10 border-b border-border">
          {hasErrors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Preview Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {mode === 'web' ? (
            <iframe
              srcDoc={previewContent}
              className="w-full h-96 border border-border rounded-lg bg-white"
              title="Web Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <div
              className="prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function renderMarkdown(content: string): string {
  // Simple markdown renderer - in a real app, use a library like marked or remark
  const html = content
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code>$1</code></pre>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n/g, '<br>');
  
  // Sanitize the generated HTML to prevent XSS
  return DOMPurify.sanitize(html);
}

function renderWebPreview(content: string): string {
  // Basic HTML template with dark theme support
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Web Preview</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 16px;
          background: #fafafa;
          color: #333;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background: #131314;
            color: #e5e5e5;
          }
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

function checkWebErrors(content: string): string[] {
  const errors: string[] = [];
  
  // Basic HTML validation
  if (content.includes('<script') && !content.includes('</script>')) {
    errors.push('Unclosed script tag detected');
  }
  
  if (content.includes('<style') && !content.includes('</style>')) {
    errors.push('Unclosed style tag detected');
  }
  
  // Check for common HTML issues
  const openTags = content.match(/<[^\/][^>]*>/g) || [];
  const closeTags = content.match(/<\/[^>]*>/g) || [];
  
  if (openTags.length !== closeTags.length) {
    errors.push('Mismatched HTML tags detected');
  }
  
  return errors;
}