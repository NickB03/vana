'use client';

import { useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { CanvasMode, CodeLanguage } from './types';

interface CanvasEditorProps {
  content: string;
  mode: CanvasMode;
  language: CodeLanguage;
  onChange: (content: string) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  className?: string;
}

export function CanvasEditor({
  content,
  mode,
  language,
  onChange,
  onKeyDown,
  className,
}: CanvasEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Monaco editor configuration
  const monacoOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 20,
    padding: { top: 16, bottom: 16 },
    wordWrap: 'on' as const,
    automaticLayout: true,
    theme: 'vs-dark',
    contextmenu: true,
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on' as const,
    accessibilitySupport: 'off' as const,
  };

  // Language mapping for Monaco
  const getMonacoLanguage = (lang: CodeLanguage): string => {
    const langMap: Record<CodeLanguage, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      sql: 'sql',
      yaml: 'yaml',
      markdown: 'markdown',
    };
    return langMap[lang] || 'plaintext';
  };

  // Auto-focus text areas on mode change
  useEffect(() => {
    if (mode !== 'code' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Tab handling for non-code modes
    if (event.key === 'Tab' && mode !== 'code') {
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      
      if (event.shiftKey) {
        // Remove tab (unindent)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        if (value.substring(lineStart, lineStart + 2) === '  ') {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
          onChange(newValue);
          setTimeout(() => {
            target.setSelectionRange(start - 2, end - 2);
          });
        }
      } else {
        // Add tab (indent)
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          target.setSelectionRange(start + 2, start + 2);
        });
      }
      return;
    }

    onKeyDown?.(event);
  };

  if (mode === 'code') {
    return (
      <div className={`h-full ${className}`}>
        <Editor
          value={content}
          language={getMonacoLanguage(language)}
          onChange={(value) => onChange(value || '')}
          options={monacoOptions}
          theme="vs-dark"
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        />
      </div>
    );
  }

  if (mode === 'sandbox') {
    return (
      <Card className={`h-full flex flex-col ${className}`}>
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-medium">JavaScript Sandbox</h3>
          <p className="text-sm text-muted-foreground">
            Write JavaScript code to test and experiment
          </p>
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Editor
              value={content}
              language="javascript"
              onChange={(value) => onChange(value || '')}
              options={{
                ...monacoOptions,
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                  showFunctions: true,
                },
              }}
              theme="vs-dark"
            />
          </div>
          
          {/* Console Output Area */}
          <div className="h-32 border-t bg-black/90 text-green-400 font-mono text-sm">
            <ScrollArea className="h-full">
              <div className="p-3">
                <div className="text-muted-foreground mb-2">Console Output:</div>
                <div className="text-xs opacity-60">
                  // Console output will appear here when code is executed
                  // Use console.log(), console.error(), etc. in your code
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>
    );
  }

  // Default textarea for Markdown, Web modes
  return (
    <div className={`h-full ${className}`}>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder(mode)}
        className="h-full resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm leading-relaxed"
        style={{
          minHeight: '100%',
        } as React.CSSProperties}
      />
    </div>
  );
}

function getPlaceholder(mode: CanvasMode): string {
  switch (mode) {
    case 'markdown':
      return `# Start writing markdown here

You can use:
- **bold text**
- *italic text*
- \`code snippets\`
- Lists and more...`;
    
    case 'web':
      return `<!DOCTYPE html>
<html>
<head>
    <title>My Web Page</title>
    <style>
        body { font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start building your web page here...</p>
</body>
</html>`;
    
    case 'sandbox':
      return `// JavaScript Sandbox
console.log('Hello, World!');

// Write your experimental code here
function example() {
    return 'This is a sandbox for testing JavaScript';
}

console.log(example());`;
    
    default:
      return 'Start typing...';
  }
}