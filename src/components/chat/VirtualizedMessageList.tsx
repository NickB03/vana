import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStickToBottom } from 'use-stick-to-bottom';
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
  artifactRenderStatus?: 'pending' | 'rendered' | 'error';
  scrollRef?: React.RefObject<HTMLDivElement>;
  // Scroll state callbacks - unified interface for both rendering paths
  onAtBottomChange?: (isAtBottom: boolean) => void;
  onScrollToBottomChange?: (scrollToBottom: () => void) => void;
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
  artifactRenderStatus,
  scrollRef,
  onAtBottomChange,
  onScrollToBottomChange,
}: VirtualizedMessageListProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollRef ?? internalRef;
  // Manual scroll state for virtualized path
  const [manualIsAtBottom, setManualIsAtBottom] = useState(true);

  // Spring-physics scroll hook for non-virtualized path (artifact messages)
  // Always called unconditionally to satisfy React hooks rules
  const {
    scrollRef: stbScrollRef,
    contentRef: stbContentRef,
    isAtBottom: stbIsAtBottom,
    scrollToBottom: stbScrollToBottom,
  } = useStickToBottom({
    resize: 'smooth',  // Spring physics on content resize
    initial: 'instant', // Jump to bottom on mount
  });

  // Check for artifact messages FIRST - this determines whether virtualization is enabled
  // Must be computed before virtualizer to pass enabled option
  const hasArtifactMessages = useMemo(() => {
    return messages.some((message) => /<artifact\b/i.test(message.content));
  }, [messages]);

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

    // Estimate additional height based on visible content length (strip artifact XML)
    const rawContent = message.content || '';
    const contentWithoutArtifacts = rawContent
      .replace(/<artifact\b[^>]*>[\s\S]*?<\/artifact>/gi, '')
      .replace(/<artifact\b[^>]*>[\s\S]*$/gi, '')
      .trim();

    const contentLength = contentWithoutArtifacts.length;
    const estimatedLines = Math.min(40, Math.ceil(contentLength / 80));
    const contentHeight = estimatedLines * 24; // ~24px per line

    // Add extra height for reasoning or search results
    let extraHeight = 0;
    if (message.reasoning || message.reasoning_steps) {
      extraHeight += 100;
    }
    if (message.search_results) {
      extraHeight += 80;
    }

    // Add estimated height for artifact cards without counting XML length
    const artifactMatches = rawContent.match(/<artifact\b/gi);
    const artifactCount = artifactMatches ? artifactMatches.length : 0;
    if (artifactCount > 0) {
      extraHeight += artifactCount * 260;
    }

    return Math.max(baseHeight, baseHeight + contentHeight + extraHeight);
  }, [messages]);

  // Disable virtualizer when artifacts are present to avoid measureElement warnings
  // TanStack Virtual's measureElement expects data-index on measured elements,
  // but the non-virtualized path doesn't include this attribute
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
    enabled: !hasArtifactMessages, // Disable when using non-virtualized rendering
  });

  // Cache total size to prevent flushSync warnings during render
  // The virtualizer.getTotalSize() call can trigger synchronous updates,
  // so we compute it once per render cycle and memoize it
  const totalSize = useMemo(() => {
    // Access getTotalSize in a safe context
    try {
      return virtualizer.getTotalSize();
    } catch {
      // Fallback to estimated size if getTotalSize fails
      return messages.length * 200;
    }
  }, [virtualizer, messages.length]);

  // Track changes in list identity even when length is unchanged (e.g., streaming-temp replaced by saved message)
  const lastMessageKey = messages[messages.length - 1]?.id ?? 'none';
  const scrollVersion = `${messages.length}-${lastMessageKey}-${totalSize}`;

  // Track whether user is at the bottom to avoid forcing scroll when they scroll up
  // ONLY for virtualized path - artifact path uses useStickToBottom hook
  useEffect(() => {
    if (hasArtifactMessages) return; // Hook handles this path

    const container = parentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setManualIsAtBottom(distanceFromBottom <= 32);
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [parentRef, hasArtifactMessages]);

  // Continuous auto-scroll during streaming using requestAnimationFrame
  // ONLY for virtualized path - artifact path uses useStickToBottom hook
  // This provides smooth scrolling that follows content growth in real-time
  useEffect(() => {
    if (hasArtifactMessages) return; // Hook handles this path
    if (!isStreaming && !manualIsAtBottom) return; // Only scroll when streaming or user is at bottom

    const container = parentRef.current;
    if (!container) return;

    let rafId: number | null = null;
    let isRunning = true;

    const scrollLoop = () => {
      if (!isRunning) return;

      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const currentScroll = container.scrollTop;
      const distanceToBottom = maxScrollTop - currentScroll;

      // Only scroll if we're not already at the bottom (with small threshold)
      if (distanceToBottom > 2) {
        // Smooth easing: move 15% of remaining distance per frame for natural feel
        // This creates a spring-like effect without jarring jumps
        const scrollAmount = Math.max(1, distanceToBottom * 0.15);
        container.scrollTop = currentScroll + scrollAmount;
      }

      // Continue loop during streaming, stop when done
      if (isStreaming) {
        rafId = requestAnimationFrame(scrollLoop);
      }
    };

    // Start the scroll loop
    rafId = requestAnimationFrame(scrollLoop);

    return () => {
      isRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isStreaming, manualIsAtBottom, hasArtifactMessages, parentRef]);

  // One-time scroll to bottom when streaming ends or messages change (non-streaming)
  const scrollTrigger = `${messages.length}-${isStreaming}`;
  useEffect(() => {
    if (hasArtifactMessages) return;
    if (isStreaming) return; // Handled by continuous loop above

    const container = parentRef.current;
    if (!container) return;

    if (manualIsAtBottom) {
      // Use double RAF to ensure layout settles
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
          container.scrollTo({ top: maxScrollTop, behavior: 'smooth' });
        });
      });
    }
  }, [scrollTrigger, manualIsAtBottom, hasArtifactMessages, parentRef]);

  // Unified scroll interface - picks source based on rendering path
  // Artifact path: spring-physics hook; Virtualized path: manual state
  const effectiveIsAtBottom = hasArtifactMessages ? stbIsAtBottom : manualIsAtBottom;

  // Create a stable manual scrollToBottom function for virtualized path
  const manualScrollToBottom = useCallback(() => {
    const container = parentRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [parentRef]);

  const effectiveScrollToBottom = hasArtifactMessages ? stbScrollToBottom : manualScrollToBottom;

  // Notify parent of scroll state changes (unified interface)
  useEffect(() => {
    onAtBottomChange?.(effectiveIsAtBottom);
  }, [effectiveIsAtBottom, onAtBottomChange]);

  useEffect(() => {
    onScrollToBottomChange?.(effectiveScrollToBottom);
  }, [effectiveScrollToBottom, onScrollToBottomChange]);

  return (
    <div
      ref={hasArtifactMessages ? stbScrollRef : parentRef}
      className={className}
      style={{
        height: '100%',
        overflow: 'auto',
        contain: 'strict',
        // CSS scroll anchoring: for virtualized path only
        // Artifact path uses useStickToBottom hook which handles anchoring
        overflowAnchor: hasArtifactMessages ? 'none' : 'auto',
      }}
    >
      {hasArtifactMessages ? (
        <div ref={stbContentRef} className="flex flex-col chat-message-container">
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isStreamingThisMessage = message.id === 'streaming-temp' && streamProgress;

            return (
              <div
                key={message.id}
                // CSS scroll anchoring: streaming content should NOT anchor to maintain bottom-stick behavior
                // Completed messages anchor normally so viewport stays stable when reading history
                className={isStreamingThisMessage ? 'chat-streaming-content' : 'chat-scroll-anchor'}
              >
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
                  artifactRenderStatus={isStreamingThisMessage ? artifactRenderStatus : undefined}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            height: `${totalSize}px`,
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
                  artifactRenderStatus={isStreamingThisMessage ? artifactRenderStatus : undefined}
                />
              </div>
            );
          })}
        </div>
      )}
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
