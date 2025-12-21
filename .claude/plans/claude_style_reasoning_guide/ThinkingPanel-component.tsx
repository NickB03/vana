// components/ThinkingPanel.tsx
// Claude-style expandable reasoning panel for GLM 4.6

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

// ============ Icons (inline SVG to avoid dependencies) ============

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
  </svg>
);

// ============ Types ============

export interface ThinkingPanelProps {
  /** The reasoning/thinking content to display */
  content: string;
  /** Current status message for the ticker (e.g., "Analyzing the problem...") */
  status?: string;
  /** Duration in seconds */
  duration: number;
  /** Whether the model is currently thinking */
  isThinking: boolean;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Callback when expand/collapse state changes */
  onExpandChange?: (isExpanded: boolean) => void;
}

// ============ Utility Functions ============

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

// ============ Component ============

export function ThinkingPanel({
  content,
  status = 'Thinking...',
  duration,
  isThinking,
  defaultExpanded = false,
  className = '',
  onExpandChange,
}: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasThinkingRef = useRef(false);

  // Auto-expand when thinking starts
  useEffect(() => {
    if (isThinking && !wasThinkingRef.current) {
      setIsExpanded(true);
      wasThinkingRef.current = true;
    } else if (!isThinking && wasThinkingRef.current) {
      wasThinkingRef.current = false;
      // Optionally auto-collapse after thinking ends
      // Uncomment below if you want auto-collapse:
      // setTimeout(() => setIsExpanded(false), 2000);
    }
  }, [isThinking]);

  // Auto-scroll content while streaming
  useEffect(() => {
    if (isThinking && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isThinking, isExpanded]);

  // Notify parent of expand state changes
  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  // Format content for display (preserve whitespace, handle code blocks)
  const formattedContent = useMemo(() => {
    if (!content) return '';
    // Basic formatting - you could enhance this with markdown parsing
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<code>$2</code>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }, [content]);

  // Don't render if no content and not thinking
  if (!content && !isThinking) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`thinking-panel ${className}`}
      style={{
        marginBottom: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color, #e5e7eb)',
        backgroundColor: 'var(--bg-secondary, #f9fafb)',
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Header / Ticker Button */}
      <button
        onClick={toggleExpanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          padding: '0.75rem 1rem',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f3f4f6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
      >
        {/* Expand/Collapse Icon */}
        <span style={{ color: 'var(--text-tertiary, #9ca3af)', flexShrink: 0 }}>
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>

        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          {isThinking ? (
            <>
              {/* Animated brain icon */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainIcon className="text-orange-500" />
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#f97316',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #4b5563)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {status}
              </span>
            </>
          ) : (
            <>
              <BrainIcon className="text-gray-400" />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary, #6b7280)' }}>
                Thought for {formatDuration(duration)}
              </span>
            </>
          )}
        </div>

        {/* Duration Badge */}
        {!isThinking && duration > 0 && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary, #6b7280)',
              backgroundColor: 'var(--bg-tertiary, #e5e7eb)',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              flexShrink: 0,
            }}
          >
            {formatDuration(duration)}
          </span>
        )}

        {/* Live indicator during thinking */}
        {isThinking && (
          <span
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              animation: 'pulse 1s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
        )}
      </button>

      {/* Expandable Content */}
      <div
        id="thinking-content"
        style={{
          maxHeight: isExpanded ? '24rem' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out',
        }}
      >
        <div
          ref={contentRef}
          style={{
            padding: '0 1rem 1rem 1rem',
            maxHeight: '20rem',
            overflowY: 'auto',
            borderTop: '1px solid var(--border-color, #e5e7eb)',
          }}
        >
          <pre
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #6b7280)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              lineHeight: '1.6',
              margin: '0.75rem 0 0 0',
            }}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
          
          {/* Streaming cursor */}
          {isThinking && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1rem',
                backgroundColor: '#f97316',
                marginLeft: '2px',
                animation: 'blink 1s step-end infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============ Tailwind Version ============
// If you're using Tailwind CSS, here's an optimized version:

export function ThinkingPanelTailwind({
  content,
  status = 'Thinking...',
  duration,
  isThinking,
  defaultExpanded = false,
  className = '',
  onExpandChange,
}: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isThinking) setIsExpanded(true);
  }, [isThinking]);

  useEffect(() => {
    if (isThinking && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isThinking, isExpanded]);

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  if (!content && !isThinking) return null;

  return (
    <div className={`mb-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-gray-500">
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isThinking ? (
            <>
              <div className="relative">
                <BrainIcon className="text-orange-500" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {status}
              </span>
            </>
          ) : (
            <>
              <BrainIcon className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Thought for {formatDuration(duration)}
              </span>
            </>
          )}
        </div>

        {!isThinking && (
          <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
            {formatDuration(duration)}
          </span>
        )}

        {isThinking && (
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
        <div
          ref={contentRef}
          className="p-4 pt-0 max-h-80 overflow-y-auto border-t border-gray-200 dark:border-gray-700"
        >
          <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed mt-3">
            {content}
            {isThinking && (
              <span className="inline-block w-0.5 h-4 bg-orange-500 animate-pulse ml-0.5" />
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default ThinkingPanel;
