import React from 'react';
import {
  Message as MessageComponent,
  MessageActions,
  MessageAction,
} from '@/components/prompt-kit/message';
import { MessageWithArtifacts } from '@/components/MessageWithArtifacts';
import { ReasoningDisplay } from '@/components/ReasoningDisplay';
import { ReasoningErrorBoundary } from '@/components/ReasoningErrorBoundary';
import { MessageSkeleton } from '@/components/ui/message-skeleton';
import { ArtifactCardSkeleton } from '@/components/ArtifactCardSkeleton';
import { Button } from '@/components/ui/button';
import { Copy, RotateCw, Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHAT_SPACING } from '@/utils/spacingConstants';
import { ArtifactData } from '@/components/ArtifactContainer';
import { motion } from 'motion/react';
import { MESSAGE_ANIMATION } from '@/utils/animationSystem';
import { StreamProgress } from '@/hooks/useChatMessages';
import { ERROR_IDS } from '@/constants/errorIds';
import { logError } from '@/utils/errorLogging';

// Helper component for tool execution loading states
interface ToolExecutionSkeletonProps {
  toolName?: string;
  status?: string;
  className?: string;
}

function ToolExecutionSkeleton({ toolName, status, className }: ToolExecutionSkeletonProps): React.ReactElement | null {
  if (!toolName) return null;

  if (toolName === 'generate_artifact') {
    return <ArtifactCardSkeleton className={className} />;
  }

  if (toolName === 'generate_image') {
    const statusLabel = status === 'complete'
      ? 'Finalizing image...'
      : 'Generating image...';

    return (
      <div className={cn("my-4 max-w-[240px]", className)}>
        <div className="relative rounded-xl overflow-hidden border-2 border-border">
          <div className="w-full aspect-square bg-muted/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
              {statusLabel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Shared button styling for message actions
const ACTION_BUTTON_CLASS = "h-11 w-11 md:h-6 md:w-6 rounded-sm hover:bg-muted/50";
const ACTION_ICON_CLASS = "h-5 w-5 md:h-3 md:w-3 text-muted-foreground/60";

// Helper component for consistent action buttons
interface ActionButtonProps {
  tooltip: string;
  ariaLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ tooltip, ariaLabel, icon, onClick, disabled }: ActionButtonProps): React.ReactElement {
  return (
    <MessageAction tooltip={tooltip} delayDuration={100}>
      <Button
        variant="ghost"
        size="icon"
        className={ACTION_BUTTON_CLASS}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {icon}
      </Button>
    </MessageAction>
  );
}

// Helper to check if message has valid reasoning content
// FIX #329: Stricter check prevents blank ticker when reasoning_steps is empty or reasoning is whitespace
function hasValidReasoning(reasoningSteps: unknown, reasoningText?: string): boolean {
  const hasSteps = Boolean(
    reasoningSteps &&
    typeof reasoningSteps === 'object' &&
    'steps' in reasoningSteps &&
    Array.isArray((reasoningSteps as { steps?: unknown }).steps) &&
    (reasoningSteps as { steps: unknown[] }).steps.length > 0
  );
  const hasText = Boolean(reasoningText && reasoningText.trim().length > 0);
  return hasSteps || hasText;
}

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
  // Streaming-specific props (only passed to streaming message)
  streamProgress?: StreamProgress;
  artifactRenderStatus?: 'pending' | 'rendered' | 'error';
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
  streamProgress,
  artifactRenderStatus,
}: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const isStreamingMessage = message.id === 'streaming-temp' && streamProgress;
  const hasReasoning = hasValidReasoning(message.reasoning_steps, message.reasoning);

  // CRITICAL: Only animate NEW messages, not entire chat history (CLAUDE.md requirement)
  const shouldAnimate = MESSAGE_ANIMATION.shouldAnimate(isLastMessage, isStreaming);

  const MotionWrapper = shouldAnimate ? motion.div : 'div';
  const motionProps = shouldAnimate ? {
    ...MESSAGE_ANIMATION.variant,
    transition: MESSAGE_ANIMATION.transition
  } : {};

  // Phase 2: Consolidated skeleton logic - determine which skeleton to show (if any)
  const shouldShowArtifactSkeleton = isStreamingMessage &&
    streamProgress?.artifactInProgress;

  const shouldShowImageSkeleton = isStreamingMessage &&
    streamProgress?.imageInProgress;

  const shouldShowToolSkeleton = shouldShowArtifactSkeleton || shouldShowImageSkeleton;

  const toolSkeletonName = shouldShowArtifactSkeleton
    ? 'generate_artifact'
    : shouldShowImageSkeleton
      ? 'generate_image'
      : undefined;

  const toolSkeletonStatus = streamProgress?.toolExecution?.success !== undefined
    ? 'complete'
    : 'pending';

  const shouldShowMessageSkeleton = isStreamingMessage &&
    !message.content &&
    !streamProgress?.toolExecution &&
    !streamProgress?.artifactDetected;

  return (
    <MotionWrapper {...motionProps}>
      <MessageComponent
        className={cn(
          "chat-message mx-auto flex w-full max-w-3xl flex-col items-start",
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
            <span className="chat-assistant-name text-foreground">Vana</span>
          </div>

          {/* STREAMING STATE - Show live streaming UI */}
          {isStreamingMessage && streamProgress ? (
            <>
              {/* Show ReasoningDisplay with streaming state */}
              <ReasoningErrorBoundary>
                <ReasoningDisplay
                  reasoning={undefined}
                  streamingReasoningText={streamProgress.streamingReasoningText}
                  reasoningStatus={streamProgress.reasoningStatus}
                  isStreaming={true}
                  artifactRendered={artifactRenderStatus === 'rendered'}
                  parentElapsedTime={lastMessageElapsedTime}
                  toolExecution={streamProgress.toolExecution}
                  elapsedSeconds={streamProgress.elapsedSeconds}
                />
              </ReasoningErrorBoundary>

              {/* CRITICAL FIX: Always show content wrapper to maintain visual connection with ReasoningDisplay */}
              {/* This prevents ReasoningDisplay from appearing as a separate message item */}
              <div className="chat-markdown">
                {message.content ? (
                  <MessageWithArtifacts
                    content={message.content}
                    messageId={message.id}
                    sessionId={message.session_id}
                    onArtifactOpen={onArtifactOpen}
                    artifactOverrides={artifactOverrides}
                    searchResults={streamProgress.searchResults}
                    artifactData={streamProgress.streamingArtifacts}
                    isStreaming={true}
                  />
                ) : shouldShowMessageSkeleton ? (
                  <MessageSkeleton className="mt-3" />
                ) : null}
              </div>

              {/* Show tool skeleton BELOW content wrapper when tool is executing */}
              {/* mt-3 matches the spacing applied to ArtifactCard in MessageWithArtifacts */}
              {shouldShowToolSkeleton && toolSkeletonName && (
                <ToolExecutionSkeleton
                  toolName={toolSkeletonName}
                  status={toolSkeletonStatus}
                  className="mt-3"
                />
              )}
            </>
          ) : (
            /* COMPLETED STATE - Show completed message UI */
            <>
              {/* FIX: Show reasoning ticker for last message if we have elapsed time, even without reasoning text
                  This handles the case where reasoning was displayed during streaming but not saved to DB */}
              {(hasReasoning || (isLastMessage && lastMessageElapsedTime)) && (
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
              <div className="chat-markdown">
                <MessageWithArtifacts
                  content={message.content}
                  messageId={message.id}
                  sessionId={message.session_id}
                  onArtifactOpen={onArtifactOpen}
                  artifactOverrides={artifactOverrides}
                  searchResults={message.search_results}
                  artifactData={message.artifacts ?? undefined}
                />
              </div>

              {/* Compact action buttons - positioned at bottom right */}
              <div className="flex justify-end">
                <MessageActions
                  className={cn(
                    "flex gap-1",
                    "opacity-100 md:opacity-60 transition-opacity duration-150 md:group-hover:opacity-100 focus-within:opacity-100",
                    isLastMessage && "opacity-100"
                  )}
                >
                  <ActionButton
                    tooltip="Retry"
                    ariaLabel="Regenerate response"
                    icon={<RotateCw className={ACTION_ICON_CLASS} />}
                    onClick={() => onRetry(message.id)}
                    disabled={isLoading || isStreaming}
                  />
                  <ActionButton
                    tooltip="Copy"
                    ariaLabel="Copy message content"
                    icon={<Copy className={ACTION_ICON_CLASS} />}
                    onClick={() => onCopy(message.content)}
                  />
                </MessageActions>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="group flex w-full flex-col gap-2 items-end">
          {/* User message with subtle pill background - no avatar inside (modern approach) */}
          {/* Right-alignment already indicates user message, avatar would waste horizontal space */}
          <div className="rounded-2xl bg-muted/60 px-4 py-3 max-w-[95%] md:max-w-[90%] w-fit">
            <div className="chat-user-message text-foreground min-w-0 break-words">
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
              <ActionButton
                tooltip="Edit"
                ariaLabel="Edit message"
                icon={<Pencil className={ACTION_ICON_CLASS} />}
                onClick={() => onEdit(message.id, message.content)}
              />
              <ActionButton
                tooltip="Copy"
                ariaLabel="Copy message content"
                icon={<Copy className={ACTION_ICON_CLASS} />}
                onClick={() => onCopy(message.content)}
              />
            </MessageActions>
          </div>
        </div>
      )}
    </MessageComponent>
    </MotionWrapper>
  );
}, (prevProps, nextProps) => {
  try {
    // CRITICAL: Exclude streaming message from memoization to ensure live updates
    // Streaming message needs to re-render on every streamProgress change
    const isStreamingMessage = nextProps.message.id === 'streaming-temp' && nextProps.streamProgress;
    if (isStreamingMessage) {
      return false; // Always re-render streaming message
    }

    // Custom comparison for completed messages - only re-render if essential props change
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
  } catch (comparisonError) {
    logError(comparisonError instanceof Error ? comparisonError : new Error(String(comparisonError)), {
      errorId: ERROR_IDS.MESSAGE_COMPARISON_FAILED,
      metadata: {
        messageId: nextProps.message.id,
      },
    });
    // On error, force re-render to be safe
    return false;
  }
});

ChatMessage.displayName = 'ChatMessage';
