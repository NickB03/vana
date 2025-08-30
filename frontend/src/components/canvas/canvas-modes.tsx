'use client';

import React, { useState, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MonacoEditor } from './monaco-editor';
import { 
  Eye, 
  Edit3, 
  Play, 
  Square, 
  RefreshCw,
  ExternalLink,
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasMode } from '@/types/canvas';

interface CanvasModesProps {
  mode: CanvasMode;
  content: string;
  onContentChange: (content: string) => void;
  title: string;
  isFullscreen?: boolean;
}

export function CanvasModes({
  mode,
  content,
  onContentChange,
  title,
  isFullscreen = false
}: CanvasModesProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [sandboxError, setSandboxError] = useState<string>('');

  const renderMarkdown = useCallback((markdown: string) => {
    // Basic markdown rendering - in production, use a proper markdown parser
    const html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(\<li\>.*\<\/li\>)/s, '<ul>$1</ul>')
      .replace(/\n/gim, '<br>');
    
    // Sanitize the generated HTML to prevent XSS
    return DOMPurify.sanitize(html);
  }, []);

  const runSandboxCode = useCallback(async () => {
    setIsRunning(true);
    setSandboxError('');
    
    try {
      // Create a safe execution environment
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');
      
      // Validate and sanitize the user code before execution
      const sanitizedCode = content
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/eval\s*\(/gi, 'Math.abs(') // Replace eval with safe function
        .replace(/Function\s*\(/gi, 'Math.abs(') // Replace Function constructor
        .replace(/setTimeout|setInterval/gi, '// blocked'); // Block timers
      
      // Prepare the code execution with additional security
      const wrappedCode = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
            <style>
              body { font-family: monospace; padding: 20px; }
              .output { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; white-space: pre-wrap; }
              .error { background: #fee; color: #c00; }
            </style>
          </head>
          <body>
            <div id="output"></div>
            <script>
              // Disable dangerous globals
              window.eval = undefined;
              window.Function = undefined;
              window.setTimeout = undefined;
              window.setInterval = undefined;
              window.XMLHttpRequest = undefined;
              window.fetch = undefined;
              
              const originalLog = console.log;
              const originalError = console.error;
              const output = document.getElementById('output');
              
              console.log = (...args) => {
                const div = document.createElement('div');
                div.className = 'output';
                div.textContent = args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                output.appendChild(div);
                originalLog(...args);
              };
              
              console.error = (...args) => {
                const div = document.createElement('div');
                div.className = 'output error';
                div.textContent = 'Error: ' + args.map(arg => String(arg)).join(' ');
                output.appendChild(div);
                originalError(...args);
              };
              
              try {
                // Execute user code in a try-catch block
                ${sanitizedCode}
              } catch (error) {
                console.error(error.message || 'Unknown error occurred');
              }
            </script>
          </body>
        </html>
      `;
      
      iframeDoc.write(wrappedCode);
      iframeDoc.close();
      
      // Wait for execution and get results
      setTimeout(() => {
        const output = iframeDoc.getElementById('output');
        setSandboxOutput(output?.innerHTML || 'No output generated');
        document.body.removeChild(iframe);
        setIsRunning(false);
      }, 1000);
      
    } catch (error) {
      setSandboxError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsRunning(false);
    }
  }, [content]);

  const stopSandboxExecution = useCallback(() => {
    setIsRunning(false);
    setSandboxOutput('Execution stopped');
  }, []);

  const clearSandboxOutput = useCallback(() => {
    setSandboxOutput('');
    setSandboxError('');
  }, []);

  const renderModeContent = useMemo(() => {
    switch (mode) {
      case 'markdown':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b">
              <Button
                variant={isPreviewMode ? "outline" : "default"}
                size="sm"
                onClick={() => setIsPreviewMode(false)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreviewMode(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isPreviewMode ? (
                <ScrollArea className="h-full">
                  <div 
                    className="p-6 prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </ScrollArea>
              ) : (
                <MonacoEditor
                  value={content}
                  onChange={onContentChange}
                  language="markdown"
                  options={{
                    wordWrap: true,
                    minimap: false
                  }}
                />
              )}
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="h-full">
            <MonacoEditor
              value={content}
              onChange={onContentChange}
              language="typescript" // Default, could be made configurable
              options={{
                wordWrap: false,
                minimap: true
              }}
            />
          </div>
        );

      case 'web':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b">
              <Button
                variant={isPreviewMode ? "outline" : "default"}
                size="sm"
                onClick={() => setIsPreviewMode(false)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                HTML/CSS
              </Button>
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreviewMode(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {isPreviewMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('data:text/html;charset=utf-8,' + encodeURIComponent(content), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isPreviewMode ? (
                <iframe
                  srcDoc={content}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title={`${title} - Web Preview`}
                />
              ) : (
                <MonacoEditor
                  value={content}
                  onChange={onContentChange}
                  language="html"
                  options={{
                    wordWrap: true,
                    minimap: false
                  }}
                />
              )}
            </div>
          </div>
        );

      case 'sandbox':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b">
              <Button
                variant="default"
                size="sm"
                onClick={runSandboxCode}
                disabled={isRunning}
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
              
              {isRunning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSandboxExecution}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearSandboxOutput}
              >
                Clear Output
              </Button>
              
              <div className="flex-1" />
              
              {sandboxError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Error detected
                </div>
              )}
            </div>
            
            <div className="flex-1 flex gap-2 p-2 overflow-hidden">
              <div className="flex-1">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <MonacoEditor
                      value={content}
                      onChange={onContentChange}
                      language="javascript"
                      options={{
                        wordWrap: false,
                        minimap: false
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex-1">
                <Card className="h-full">
                  <CardContent className="p-4 h-full">
                    <h4 className="font-semibold mb-2">Output:</h4>
                    <ScrollArea className="h-full">
                      {sandboxError ? (
                        <div className="text-destructive font-mono text-sm whitespace-pre-wrap">
                          {sandboxError}
                        </div>
                      ) : (
                        <div 
                          className="font-mono text-sm"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sandboxOutput) || 'No output yet. Run the code to see results.' }}
                        />
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="p-4">Unknown mode: {mode}</div>;
    }
  }, [mode, content, isPreviewMode, isRunning, sandboxOutput, sandboxError, onContentChange, title, renderMarkdown, runSandboxCode, stopSandboxExecution, clearSandboxOutput]);

  return (
    <div className={cn('h-full bg-background', isFullscreen && 'border-0')}>
      {renderModeContent}
    </div>
  );
}