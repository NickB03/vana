/**
 * Monaco Editor Sandbox Component
 * Runs Monaco Editor in an isolated iframe with its own CSP
 * This allows unsafe-eval for Monaco while keeping main app secure
 */

import { useEffect, useRef, useState } from 'react';

interface MonacoSandboxProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  options?: Record<string, unknown>;
  className?: string;
}

/**
 * Renders a sandboxed iframe running Monaco Editor and keeps its content synchronized with the parent React state.
 *
 * The iframe is injected with a self-contained HTML document that loads Monaco from a CDN and configures a
 * content-security-policy allowing Monaco's runtime requirements (including `unsafe-eval`). The parent and iframe
 * communicate via postMessage:
 * - iframe -> parent: { type: 'monaco-change', value } when the editor content changes, and { type: 'monaco-ready' } when ready.
 * - parent -> iframe: { type: 'monaco-update', value } to set editor content.
 *
 * @param value - Initial and controlled editor content; updates to this prop are posted to the iframe once the editor signals readiness.
 * @param language - Monaco language identifier to use for the editor (default: `'javascript'`).
 * @param onChange - Optional callback invoked with the editor value when the editor posts a `monaco-change` message.
 * @param options - Additional Monaco editor options merged into the created editor instance.
 * @param className - Additional CSS classes applied to the iframe element.
 * @returns A React element: an iframe that hosts the sandboxed Monaco Editor.
 */
export function MonacoSandbox({
  value,
  language = 'javascript',
  onChange,
  options = {},
  className = ''
}: MonacoSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;

    // Create sandboxed content with Monaco Editor
    // This iframe has its own CSP that allows unsafe-eval for Monaco
    const sandboxedContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'self';
          script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
          style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
          font-src 'self' data: https://cdn.jsdelivr.net;
          worker-src 'self' blob:;
        ">
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          #editor { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="editor"></div>
        <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
        <script>
          require.config({ 
            paths: { 
              vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
            } 
          });

          require(['vs/editor/editor.main'], function() {
            const editor = monaco.editor.create(document.getElementById('editor'), {
              value: ${JSON.stringify(value)},
              language: '${language}',
              theme: 'vs-dark',
              automaticLayout: true,
              ...${JSON.stringify(options)}
            });

            // Send changes to parent
            editor.onDidChangeModelContent(() => {
              window.parent.postMessage({
                type: 'monaco-change',
                value: editor.getValue()
              }, '*');
            });

            // Listen for updates from parent
            window.addEventListener('message', (event) => {
              if (event.data.type === 'monaco-update') {
                editor.setValue(event.data.value);
              }
            });

            // Signal ready
            window.parent.postMessage({ type: 'monaco-ready' }, '*');
          });
        </script>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(sandboxedContent);
    iframeDoc.close();

    // Handle messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'monaco-change' && onChange) {
        onChange(event.data.value);
      } else if (event.data.type === 'monaco-ready') {
        setIsReady(true);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [language, options]);

  // Update value in iframe when prop changes
  useEffect(() => {
    if (!isReady || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage({
      type: 'monaco-update',
      value
    }, '*');
  }, [value, isReady]);

  return (
    <iframe
      ref={iframeRef}
      className={`border-0 ${className}`}
      title="Monaco Editor"
      sandbox="allow-scripts allow-same-origin"
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  );
}