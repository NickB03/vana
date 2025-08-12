/**
 * CodeBlock component with syntax highlighting and Canvas integration
 * Supports multiple languages, copy functionality, and line numbers
 */

import React, { useState, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Eye,
  Code2,
  FileText,
  Terminal
} from 'lucide-react';
import { clsx } from 'clsx';
import type { CodeBlock } from '../../types/chat';

interface CodeBlockProps {
  codeBlock: CodeBlock;
  onOpenInCanvas?: (codeBlock: CodeBlock) => void;
  onDownload?: (codeBlock: CodeBlock) => void;
  className?: string;
}

// Language icon mapping
const getLanguageIcon = (language: string) => {
  const lang = language.toLowerCase();
  
  if (['bash', 'shell', 'sh', 'zsh'].includes(lang)) return Terminal;
  if (['javascript', 'typescript', 'jsx', 'tsx'].includes(lang)) return Code2;
  if (['markdown', 'md'].includes(lang)) return FileText;
  
  return Code2;
};

// Language display name mapping
const getLanguageDisplayName = (language: string): string => {
  const mappings: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript (JSX)',
    'ts': 'TypeScript',
    'tsx': 'TypeScript (JSX)',
    'py': 'Python',
    'sh': 'Shell',
    'bash': 'Bash',
    'zsh': 'Zsh',
    'md': 'Markdown',
    'yaml': 'YAML',
    'yml': 'YAML',
    'json': 'JSON',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sql': 'SQL',
  };
  
  return mappings[language.toLowerCase()] || language.toUpperCase();
};

// Format file size
const formatFileSize = (code: string): string => {
  const size = new Blob([code]).size;
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  codeBlock,
  onOpenInCanvas,
  onDownload,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { language, code, filename, canOpenInCanvas, lineNumbers = true } = codeBlock;
  
  // Determine if code should be collapsed by default
  const shouldCollapse = code.split('\n').length > 20;
  const displayCode = shouldCollapse && !isExpanded 
    ? code.split('\n').slice(0, 20).join('\n') + '\n// ... (truncated)'
    : code;
  
  const LanguageIcon = getLanguageIcon(language);
  
  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [code]);
  
  // Download as file
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(codeBlock);
    } else {
      // Default download behavior
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `code.${language}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [codeBlock, code, filename, language, onDownload]);
  
  // Open in Canvas
  const handleOpenInCanvas = useCallback(() => {
    onOpenInCanvas?.(codeBlock);
  }, [codeBlock, onOpenInCanvas]);
  
  return (
    <div className={clsx('rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <LanguageIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getLanguageDisplayName(language)}
          </span>
          {filename && (
            <>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {filename}
              </span>
            </>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {formatFileSize(code)}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {shouldCollapse && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          
          {canOpenInCanvas && onOpenInCanvas && (
            <button
              onClick={handleOpenInCanvas}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors"
              title="Open in Canvas"
            >
              <ExternalLink className="w-3 h-3" />
              Canvas
            </button>
          )}
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors"
            title="Download"
          >
            <Download className="w-3 h-3" />
          </button>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors"
            title={copied ? 'Copied!' : 'Copy code'}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Copied</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
      
      {/* Code content */}
      <div className="relative">
        <Highlight
          theme={themes.vsLight}
          code={displayCode}
          language={language as any}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={clsx(
                className,
                'overflow-x-auto text-sm leading-relaxed',
                'bg-white dark:bg-gray-900'
              )}
              style={{
                ...style,
                background: 'transparent',
                margin: 0,
                padding: 0,
              }}
            >
              <code className="block">
                {tokens.map((line, i) => {
                  const lineProps = getLineProps({ line, key: i });
                  return (
                    <div
                      key={i}
                      {...lineProps}
                      className={clsx(
                        lineProps.className,
                        'flex px-4 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                    >
                      {lineNumbers && (
                        <span className="flex-shrink-0 w-8 text-right text-gray-400 dark:text-gray-500 select-none mr-4 font-mono text-xs leading-relaxed">
                          {i + 1}
                        </span>
                      )}
                      <span className="flex-1">
                        {line.map((token, key) => {
                          const tokenProps = getTokenProps({ token, key });
                          return (
                            <span
                              key={key}
                              {...tokenProps}
                              className={clsx(
                                tokenProps.className,
                                'font-mono'
                              )}
                            />
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>
          )}
        </Highlight>
        
        {/* Expand overlay for collapsed code */}
        {shouldCollapse && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent flex items-end justify-center pb-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded border transition-colors"
            >
              Show more ({code.split('\n').length - 20} more lines)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};