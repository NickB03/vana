import React, { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatMessage } from './ChatMessage';
import { ArtifactData } from '@/components/ArtifactContainer';
import { StreamProgress } from '@/hooks/useChatMessages';
import { ERROR_IDS } from '@/constants/errorIds';
import { logError, logForDebugging } from '@/utils/errorLogging';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  session_id: string;
  reasoning?: string;
  reasoning_steps?: unknown;
  search_results?: unknown;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  lastMessageElapsedTime?: string;
  onRetry: (messageId: string) => void;
  onCopy: (content: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onArtifactOpen: (artifact: ArtifactData) => void;
  artifactOverrides?: Record<string, Partial<ArtifactData>>;
  className?: string;
  // Streaming-specific props
  streamProgress?: StreamProgress;
  onCancelStream?: () => void;
  artifactRenderStatus?: 'pending' | 'rendered' | 'error';
}

/**
 * VirtualizedMessageList - Optimized message list with virtual scrolling
 *
 * Performance benefits:
 * - Only renders visible messages in the DOM (reduces DOM nodes by 90%+)
 * - Dramatically improves scroll performance with 50+ messages
 * - Maintains smooth animations for new messages
 * - Prevents layout thrashing on mobile devices
 *
 * Implementation notes:
 * - Uses @tanstack/react-virtual for efficient windowing
 * - Dynamic size estimation based on message content
 * - 5 item overscan for smooth scrolling
 * - Memoized to prevent unnecessary re-renders
 * - Self-contained with own scroll container
 *
 * Usage:
 * ```tsx
 * <VirtualizedMessageList
 *   messages={messages}
 *   isStreaming={isStreaming}
 *   isLoading={isLoading}
 *   lastMessageElapsedTime={lastMessageElapsedTime}
 *   onRetry={handleRetry}
 *   onCopy={handleCopy}
 *   onEdit={handleEdit}
 *   onArtifactOpen={handleArtifactOpen}
 *   artifactOverrides={artifactOverrides}
 *   className="flex-1"
 * />
 * ```
 *
 * Integration note:
 * This component replaces the standard message list with built-in virtualization.
 * It creates its own scroll container, so it should NOT be used inside StickToBottom.
 * For integration with ChatInterface, replace the ChatContainerRoot/ChatContainerContent
 * wrapper with this component directly.
 */
export const VirtualizedMessageList = React.memo(function VirtualizedMessageList({
  messages,
  isStreaming,
  isLoading,
  lastMessageElapsedTime,
  onRetry,
  onCopy,
  onEdit,
  onArtifactOpen,
  artifactOverrides,
  className,
  streamProgress,
  onCancelStream,
  artifactRenderStatus,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Estimate size based on message content
  const estimateSize = useCallback((index: number) => {
    const message = messages[index];
    if (!message) {
      logForDebugging('VirtualizedMessageList: missing message at index', {
        index,
        messagesLength: messages.length,
      });
      return 200;
    }

    // Use larger fixed height for streaming message to avoid constant re-measurement
    if (message.id === 'streaming-temp') {
      return 400; // Generous estimate for streaming content with reasoning
    }

    // Base heights differ by role
    const baseHeight = message.role === 'assistant' ? 150 : 80;

    // Estimate additional height based on content length
    const contentLength = message.content?.length || 0;
    const estimatedLines = Math.ceil(contentLength / 80);
    const contentHeight = estimatedLines * 24; // ~24px per line

    // Add extra height for reasoning or search results
    let extraHeight = 0;
    if (message.reasoning || message.reasoning_steps) {
      extraHeight += 100;
    }
    if (message.search_results) {
      extraHeight += 80;
    }

    return Math.max(baseHeight, baseHeight + contentHeight + extraHeight);
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && parentRef.current) {
      try {
        parentRef.current.scrollTo({
          top: parentRef.current.scrollHeight,
          behavior: 'smooth',
        });
      } catch (scrollError) {
        // Fallback to instant scroll
        try {
          parentRef.current.scrollTop = parentRef.current.scrollHeight;
        } catch (fallbackError) {
          logError(fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)), {
            errorId: ERROR_IDS.MESSAGE_LIST_SCROLL_FAILED,
            sessionId: '', // TODO: Get sessionId from props if needed
            metadata: {
              messagesLength: messages.length,
              scrollHeight: parentRef.current?.scrollHeight,
              clientHeight: parentRef.current?.clientHeight,
            },
          });
        }
      }
    }
  }, [messages.length]);

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: '100%',
        overflow: 'auto',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          if (!message) return null;

          const isLastMessage = virtualRow.index === messages.length - 1;
          // Only pass streaming props to the streaming message
          const isStreamingThisMessage = message.id === 'streaming-temp' && streamProgress;

          return (
            <div
              key={message.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Animation is handled internally by ChatMessage via MESSAGE_ANIMATION */}
              <ChatMessage
                message={message}
                isLastMessage={isLastMessage}
                isStreaming={isStreaming && isLastMessage}
                isLoading={isLoading}
                lastMessageElapsedTime={isLastMessage ? lastMessageElapsedTime : undefined}
                onRetry={onRetry}
                onCopy={onCopy}
                onEdit={onEdit}
                onArtifactOpen={onArtifactOpen}
                artifactOverrides={artifactOverrides}
                streamProgress={isStreamingThisMessage ? streamProgress : undefined}
                onCancel={isStreamingThisMessage ? onCancelStream : undefined}
                artifactRenderStatus={isStreamingThisMessage ? artifactRenderStatus : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // IMPORTANT: Include streamProgress comparison for streaming updates
  return (
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages[prevProps.messages.length - 1]?.id === nextProps.messages[nextProps.messages.length - 1]?.id &&
    prevProps.messages[prevProps.messages.length - 1]?.content === nextProps.messages[nextProps.messages.length - 1]?.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.lastMessageElapsedTime === nextProps.lastMessageElapsedTime &&
    prevProps.artifactOverrides === nextProps.artifactOverrides &&
    prevProps.streamProgress === nextProps.streamProgress &&
    prevProps.artifactRenderStatus === nextProps.artifactRenderStatus
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';
