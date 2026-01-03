import React from 'react';
import {
  Message as MessageComponent,
  MessageActions,
  MessageAction,
} from '@/components/prompt-kit/message';
import { MessageWithArtifacts } from '@/components/MessageWithArtifacts';
import { ReasoningDisplay } from '@/components/ReasoningDisplay';
import { ReasoningErrorBoundary } from '@/components/ReasoningErrorBoundary';
import { Button } from '@/components/ui/button';
import { Copy, RotateCw, Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHAT_SPACING } from '@/utils/spacingConstants';
import { ArtifactData } from '@/components/ArtifactContainer';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    session_id: string;
    reasoning?: string;
    reasoning_steps?: unknown;
    search_results?: unknown;
  };
  isLastMessage: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  lastMessageElapsedTime?: string;
  onRetry: (messageId: string) => void;
  onCopy: (content: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onArtifactOpen: (artifact: ArtifactData) => void;
  artifactOverrides?: Record<string, Partial<ArtifactData>>;
}

/**
 * Memoized chat message component to prevent unnecessary re-renders.
 *
 * Performance optimizations:
 * - React.memo prevents re-renders when props haven't changed
 * - Custom comparison function checks only essential props
 * - Memoized callbacks from parent prevent prop changes
 *
 * This significantly improves performance during:
 * - Input typing (no longer re-renders all messages)
 * - Scrolling (no layout thrashing)
 * - Large conversation histories
 */
export const ChatMessage = React.memo(function ChatMessage({
  message,
  isLastMessage,
  isStreaming,
  isLoading,
  lastMessageElapsedTime,
  onRetry,
  onCopy,
  onEdit,
  onArtifactOpen,
  artifactOverrides,
}: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  // FIX #329: Stricter check for displayable reasoning content
  // Prevents blank ticker when reasoning_steps is empty array or reasoning is whitespace
  // Type-safe check that properly narrows the type
  const hasValidReasoningSteps = Boolean(
    message.reasoning_steps &&
    typeof message.reasoning_steps === 'object' &&
    'steps' in message.reasoning_steps &&
    Array.isArray((message.reasoning_steps as { steps?: unknown }).steps) &&
    (message.reasoning_steps as { steps: unknown[] }).steps.length > 0
  );
  const hasValidReasoningText = Boolean(message.reasoning && message.reasoning.trim().length > 0);
  const hasReasoning = hasValidReasoningSteps || hasValidReasoningText;

  return (
    <MessageComponent
      className={cn(
        "chat-message mx-auto flex w-full max-w-5xl flex-col items-start",
        CHAT_SPACING.message.container
      )}
      data-testid="chat-message"
    >
      {isAssistant ? (
        <div className="group flex w-full flex-col gap-1.5">
          {/* Assistant header with icon and name */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Vana</span>
          </div>

          {hasReasoning && (
            <ReasoningErrorBoundary>
              {/* FIX: Provide streamingReasoningText as fallback for completed messages */}
              <ReasoningDisplay
                reasoning={message.reasoning}
                streamingReasoningText={message.reasoning}
                isStreaming={false}
                artifactRendered={true}
                parentElapsedTime={isLastMessage ? lastMessageElapsedTime : undefined}
              />
            </ReasoningErrorBoundary>
          )}
          <MessageWithArtifacts
            content={message.content}
            messageId={message.id}
            sessionId={message.session_id}
            onArtifactOpen={onArtifactOpen}
            artifactOverrides={artifactOverrides}
            searchResults={message.search_results}
          />

          {/* Compact action buttons - positioned at bottom right */}
          <div className="flex justify-end">
            <MessageActions
              className={cn(
                "flex gap-1",
                "opacity-100 md:opacity-60 transition-opacity duration-150 md:group-hover:opacity-100 focus-within:opacity-100",
                isLastMessage && "opacity-100"
              )}
            >
              <MessageAction tooltip="Retry" delayDuration={100}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                  onClick={() => onRetry(message.id)}
                  disabled={isLoading || isStreaming}
                  aria-label="Regenerate response"
                >
                  <RotateCw className="h-5 w-5 md:h-3 md:w-3 text-muted-foreground/60" />
                </Button>
              </MessageAction>
              <MessageAction tooltip="Copy" delayDuration={100}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                  onClick={() => onCopy(message.content)}
                  aria-label="Copy message content"
                >
                  <Copy className="h-5 w-5 md:h-3 md:w-3 text-muted-foreground/60" />
                </Button>
              </MessageAction>
            </MessageActions>
          </div>
        </div>
      ) : (
        <div className="group flex w-full flex-col gap-2 items-end">
          {/* User message with subtle pill background (Claude-style) */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2 max-w-[85%] w-fit">
            {/* User avatar: 32px circle (Claude-style) */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              U
            </div>

            {/* Message content - wraps properly within container */}
            <div className="text-[15px] text-foreground leading-relaxed min-w-0 break-words">
              {message.content}
            </div>
          </div>

          {/* Compact action buttons - positioned at bottom right (consistent with assistant) */}
          <div className="flex justify-end">
            <MessageActions
              className={cn(
                "flex gap-1",
                "opacity-100 md:opacity-60 transition-opacity duration-150 md:group-hover:opacity-100 focus-within:opacity-100"
              )}
            >
              <MessageAction tooltip="Edit" delayDuration={100}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                  onClick={() => onEdit(message.id, message.content)}
                  aria-label="Edit message"
                >
                  <Pencil className="h-5 w-5 md:h-3 md:w-3 text-muted-foreground/60" />
                </Button>
              </MessageAction>
              <MessageAction tooltip="Copy" delayDuration={100}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                  onClick={() => onCopy(message.content)}
                  aria-label="Copy message content"
                >
                  <Copy className="h-5 w-5 md:h-3 md:w-3 text-muted-foreground/60" />
                </Button>
              </MessageAction>
            </MessageActions>
          </div>
        </div>
      )}
    </MessageComponent>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these essential props change
  // This prevents re-renders when parent state changes (like input typing)
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.reasoning === nextProps.message.reasoning &&
    prevProps.message.reasoning_steps === nextProps.message.reasoning_steps &&
    prevProps.message.search_results === nextProps.message.search_results &&
    prevProps.isLastMessage === nextProps.isLastMessage &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.lastMessageElapsedTime === nextProps.lastMessageElapsedTime &&
    prevProps.artifactOverrides === nextProps.artifactOverrides
  );
});

ChatMessage.displayName = 'ChatMessage';
