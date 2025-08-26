/**
 * Monaco Editor Sandbox Component
 * Runs Monaco Editor in an isolated iframe with its own CSP
 * This allows unsafe-eval for Monaco while keeping main app secure
 * Enhanced with comprehensive security measures
 */

import { useEffect, useRef, useState } from 'react';
import { 
  sanitizeHtml, 
  sanitizeText, 
  containsMaliciousPatterns, 
  logSecurityViolation,
  isValidUuid
} from '@/lib/security';
import { getNonce } from '@/lib/csp';

interface MonacoSandboxProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  options?: Record<string, unknown>;
  className?: string;
  maxLength?: number;
  allowedLanguages?: string[];
  readOnly?: boolean;
  sandboxId?: string;
}

interface MonacoMessage {
  type: 'monaco-change' | 'monaco-ready' | 'monaco-update' | 'monaco-error';
  value?: string;
  error?: string;
  sandboxId?: string;
}

export function MonacoSandbox({
  value,
  language = 'javascript',
  onChange,
  options = {},
  className = '',
  maxLength = 100000, // 100KB limit
  allowedLanguages = ['javascript', 'typescript', 'json', 'html', 'css', 'markdown', 'python', 'yaml'],
  readOnly = false,
  sandboxId
}: MonacoSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageQueueRef = useRef<MonacoMessage[]>([]);
  const securityContextRef = useRef<string>(sandboxId || `monaco-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;
    
    // Validate language
    if (!allowedLanguages.includes(language)) {
      setError(`Language '${language}' is not allowed`);
      return;
    }
    
    // Validate and sanitize initial value
    if (containsMaliciousPatterns(value)) {
      console.error('Monaco: Potentially malicious code detected in initial value');
      logSecurityViolation('xss_attempt', { source: 'monaco-editor', value: value.substring(0, 100) });
      setError('Content contains potentially harmful code');
      return;
    }
    
    const sanitizedValue = sanitizeText(value);
    const nonce = getNonce();

    // Create highly secure sandboxed content with Monaco Editor
    // This iframe has its own restrictive CSP that only allows necessary Monaco functionality
    const secureOptions = {
      ...options,
      readOnly,
      maxTokenizationLineLength: 1000,
      maxTokenizationColumnLength: 1000,
      // Security options
      wordWrap: 'on',
      wordWrapColumn: 120,
      scrollBeyondLastLine: false,
      folding: true,
      links: false, // Disable clickable links for security
      colorDecorators: false,
      contextmenu: !readOnly,
      quickSuggestions: !readOnly,
      parameterHints: { enabled: !readOnly },
      suggestOnTriggerCharacters: !readOnly,
      acceptSuggestionOnEnter: readOnly ? 'off' : 'on',
    };
    
    const sandboxedContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          script-src 'self' 'unsafe-eval' 'nonce-${nonce}' https://cdn.jsdelivr.net;
          style-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://cdn.jsdelivr.net;
          font-src 'self' data: https://cdn.jsdelivr.net;
          worker-src 'self' blob:;
          connect-src 'self';
          img-src 'self' data:;
          base-uri 'none';
          form-action 'none';
          frame-ancestors 'none';
        ">
        <meta name="referrer" content="no-referrer">
        <title>Monaco Editor Sandbox</title>
        <style nonce="${nonce}">
          body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #1e1e1e;
          }
          #editor { 
            width: 100vw; 
            height: 100vh; 
            min-height: 200px;
          }
          .error-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.1);
            color: #ff4444;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <div id="editor"></div>
        <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"
                crossorigin="anonymous"></script>
        <script nonce="${nonce}">
          const SANDBOX_ID = '${securityContextRef.current}';
          const MAX_CONTENT_LENGTH = ${maxLength};
          const ALLOWED_LANGUAGES = ${JSON.stringify(allowedLanguages)};
          let editor = null;
          
          // Security validation function
          function validateContent(content) {
            if (!content) return { valid: true, content: '' };
            if (typeof content !== 'string') return { valid: false, error: 'Content must be a string' };
            if (content.length > MAX_CONTENT_LENGTH) {
              return { valid: false, error: \`Content exceeds maximum length of \${MAX_CONTENT_LENGTH} characters\` };
            }
            
            // Context-aware XSS pattern detection - only check for web languages
            const shouldCheckXSS = ['html', 'javascript', 'typescript', 'jsx', 'tsx'].includes('${language}');
            
            const dangerousPatterns = shouldCheckXSS ? [
              /<script[^>]*>/i,
              /javascript:/i,
              /on\w+\s*=/i,
              /eval\s*\(/i,
              /document\.(write|writeln)\s*\(/i
            ] : [];
            
            for (const pattern of dangerousPatterns) {
              if (pattern.test(content)) {
                return { valid: false, error: 'Content contains potentially harmful code' };
              }
            }
            
            return { valid: true, content };
          }
          
          // Error handling
          function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-overlay';
            errorDiv.textContent = message;
            document.body.appendChild(errorDiv);
            
            window.parent.postMessage({
              type: 'monaco-error',
              error: message,
              sandboxId: SANDBOX_ID
            }, window.location.origin);
          }
          
          // Validate language
          if (!ALLOWED_LANGUAGES.includes('${language}')) {
            showError('Language not allowed: ${language}');
            throw new Error('Language not allowed');
          }

          require.config({ 
            paths: { 
              vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
            }
          });

          require(['vs/editor/editor.main'], function() {
            try {
              // Validate initial content
              const validation = validateContent(${JSON.stringify(sanitizedValue)});
              if (!validation.valid) {
                showError(validation.error);
                return;
              }
              
              editor = monaco.editor.create(document.getElementById('editor'), {
                value: validation.content,
                language: '${language}',
                theme: 'vs-dark',
                automaticLayout: true,
                ...${JSON.stringify(secureOptions)}
              });

              // Send changes to parent with validation
              editor.onDidChangeModelContent(() => {
                try {
                  const content = editor.getValue();
                  const validation = validateContent(content);
                  
                  if (!validation.valid) {
                    console.error('Content validation failed:', validation.error);
                    return;
                  }
                  
                  window.parent.postMessage({
                    type: 'monaco-change',
                    value: validation.content,
                    sandboxId: SANDBOX_ID
                  }, window.location.origin);
                } catch (error) {
                  console.error('Error in change handler:', error);
                }
              });

              // Listen for updates from parent
              window.addEventListener('message', (event) => {
                try {
                  // Validate message origin
                  if (event.origin !== window.location.origin) {
                    console.warn('Ignoring message from invalid origin:', event.origin);
                    return;
                  }
                  
                  if (event.data.type === 'monaco-update' && event.data.sandboxId === SANDBOX_ID) {
                    const validation = validateContent(event.data.value);
                    if (validation.valid && editor) {
                      editor.setValue(validation.content);
                    } else if (!validation.valid) {
                      console.error('Update content validation failed:', validation.error);
                    }
                  }
                } catch (error) {
                  console.error('Error handling message:', error);
                }
              });

              // Signal ready
              window.parent.postMessage({ 
                type: 'monaco-ready',
                sandboxId: SANDBOX_ID
              }, window.location.origin);
              
            } catch (error) {
              showError('Failed to initialize Monaco Editor: ' + error.message);
            }
          });
          
          // Handle uncaught errors
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('Monaco sandbox error:', { msg, url, lineNo, columnNo, error });
            showError('Editor error: ' + msg);
            return false;
          };
        </script>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(sandboxedContent);
    iframeDoc.close();

    // Handle messages from iframe with enhanced security
    const handleMessage = (event: MessageEvent) => {
      // Strict origin validation
      if (event.origin !== window.location.origin) {
        console.warn('Monaco: Ignoring message from invalid origin:', event.origin);
        logSecurityViolation('invalid_input', { 
          source: 'monaco-sandbox', 
          origin: event.origin,
          expected: window.location.origin 
        });
        return;
      }
      
      const messageData = event.data as MonacoMessage;
      
      // Validate sandbox ID
      if (messageData.sandboxId && messageData.sandboxId !== securityContextRef.current) {
        console.warn('Monaco: Message from wrong sandbox instance');
        return;
      }
      
      try {
        switch (messageData.type) {
          case 'monaco-change':
            if (onChange && messageData.value !== undefined) {
              // Validate content before calling onChange
              if (containsMaliciousPatterns(messageData.value)) {
                console.error('Monaco: Potentially malicious content detected');
                logSecurityViolation('xss_attempt', { 
                  source: 'monaco-editor', 
                  content: messageData.value.substring(0, 100) 
                });
                setError('Content contains potentially harmful code');
                return;
              }
              
              if (messageData.value.length > maxLength) {
                setError(`Content exceeds maximum length of ${maxLength} characters`);
                return;
              }
              
              const sanitizedValue = sanitizeText(messageData.value);
              onChange(sanitizedValue);
            }
            break;
            
          case 'monaco-ready':
            setIsReady(true);
            setError(null);
            // Send any queued messages
            messageQueueRef.current.forEach(msg => {
              iframe.contentWindow?.postMessage(msg, window.location.origin);
            });
            messageQueueRef.current = [];
            break;
            
          case 'monaco-error':
            setError(messageData.error || 'Unknown Monaco error');
            setIsReady(false);
            break;
            
          default:
            console.warn('Monaco: Unknown message type:', messageData.type);
        }
      } catch (error) {
        console.error('Monaco: Error handling message:', error);
        setError('Error processing editor message');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [language, options]);

  // Update editor content with security validation
  useEffect(() => {
    if (isReady && iframeRef.current?.contentWindow) {
      // Validate and sanitize value before sending
      if (containsMaliciousPatterns(value)) {
        console.error('Monaco: Potentially malicious content in update');
        setError('Content contains potentially harmful code');
        return;
      }
      
      if (value.length > maxLength) {
        setError(`Content exceeds maximum length of ${maxLength} characters`);
        return;
      }
      
      const sanitizedValue = sanitizeText(value);
      const updateMessage: MonacoMessage = {
        type: 'monaco-update',
        value: sanitizedValue,
        sandboxId: securityContextRef.current
      };
      
      try {
        iframeRef.current.contentWindow.postMessage(updateMessage, window.location.origin);
      } catch (error) {
        console.error('Monaco: Failed to send update message:', error);
        setError('Failed to update editor content');
      }
    } else if (!isReady) {
      // Queue the message for when the editor is ready
      messageQueueRef.current.push({
        type: 'monaco-update',
        value: sanitizeText(value),
        sandboxId: securityContextRef.current
      });
    }
  }, [value, isReady, maxLength]);

  // Show error overlay if there's an error
  if (error) {
    return (
      <div className={`relative ${className}`} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        <div className="absolute inset-0 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-red-600 font-semibold mb-2">Monaco Editor Error</div>
            <div className="text-red-500 text-sm">{error}</div>
            <button 
              onClick={() => setError(null)} 
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <iframe
        ref={iframeRef}
        className="border-0 w-full h-full"
        title={`Monaco Editor - ${language}`}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        // Security attributes
        referrerPolicy="no-referrer"
        loading="lazy"
        allow="" // No additional permissions
      />
      {!isReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-600">Loading Monaco Editor...</div>
        </div>
      )}
    </div>
  );
}