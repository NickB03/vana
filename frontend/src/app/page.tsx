"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  useChatStream,
  ChatStreamReturn,
  useChatStore,
} from "@/hooks/useChatStream";
import { apiClient } from "@/lib/api/client";
import VanaHomePage from "@/components/vana/VanaHomePage";
import VanaSidebar from "@/components/vana/VanaSidebar";
import {
  validateChatInput,
  getCharacterStatus,
  RateLimitTracker,
} from "@/lib/validation/chat-validation";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container";
import {
  Message,
  MessageAvatar,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message";
import { Markdown } from "@/components/prompt-kit/markdown";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import { Loader } from "@/components/prompt-kit/loader";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUp,
  Copy,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react";
// Removed unused imports: Steps components now data-driven from backend SSE
import { PageTransition } from "@/components/transitions/PageTransition";

function ChatView({
  chat,
  onExit,
}: {
  chat: ChatStreamReturn;
  onExit: () => void;
}) {
  const { messages, sendMessage, isStreaming, currentSession, error, sessionId } = chat;
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messagesFeedback, setMessagesFeedback] = useState<
    Record<string, "upvote" | "downvote" | null>
  >({});
  const [thoughtProcess, setThoughtProcess] = useState<{
    messageId: string | null;
    status: "thinking" | "complete" | null;
    isVisible: boolean;
  }>({
    messageId: null,
    status: null,
    isVisible: false,
  });
  // Agent steps are now data-driven from backend SSE events (research_update)
  // No hardcoded progress indicators - use real currentSession progress data
  const [validationError, setValidationError] = useState<string | null>(null);
  const rateLimiter = useRef(new RateLimitTracker());
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Phase 3.3: Session pre-creation on mount
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Memoized character count status for performance
  const characterStatus = useMemo(
    () => getCharacterStatus(inputValue.length),
    [inputValue.length],
  );

  // Phase 3.3: Ensure session exists before user can send messages
  // This prevents "connect() aborting" errors caused by hook ref timing issues
  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      try {
        const { switchOrCreateSession, currentSessionId } = useChatStore.getState();

        if (!currentSessionId) {
          console.log('[ChatView] No session on mount, creating via backend');
          await switchOrCreateSession();
        } else {
          console.log('[ChatView] Session already exists on mount:', currentSessionId);
        }

        if (!cancelled) {
          setSessionReady(true);
          setSessionError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to initialize session';
          console.error('[ChatView] Session initialization error:', errorMsg, error);
          setSessionError(errorMsg);
        }
      }
    };

    initializeSession();
    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount - backend-first session creation

  useEffect(() => {
    const viewport = chatContainerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | undefined;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSubmit = async (submittedValue?: string) => {
    // Use provided value or fall back to state (fixes Enter key bypass)
    const valueToValidate =
      submittedValue !== undefined ? submittedValue : inputValue;

    // Clear previous validation errors
    setValidationError(null);

    // Validate input
    const validationResult = validateChatInput(valueToValidate);
    if (!validationResult.success) {
      const errorMessage = validationResult.error?.message || "Invalid input";
      setValidationError(errorMessage);
      console.error(
        "[Validation Failed]",
        errorMessage,
        "Input:",
        valueToValidate.substring(0, 100),
      );
      return;
    }

    // Check rate limit (client-side UX)
    if (!rateLimiter.current.canSend()) {
      const secondsRemaining = rateLimiter.current.getSecondsUntilReset();
      const rateLimitMessage = `Rate limit reached. Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? "s" : ""} before sending another message.`;
      setValidationError(rateLimitMessage);
      console.warn("[Rate Limited]", rateLimitMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedValue = valueToValidate.trim();
      console.log("[Sending Message]", trimmedValue.substring(0, 100));
      await sendMessage(trimmedValue);
      rateLimiter.current.incrementCount();
      setInputValue("");
      setValidationError(null);
    } catch (error) {
      console.error("[Send Failed]", error);
      setValidationError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // File upload handler
  const handleFilesAdded = useCallback((files: File[]) => {
    // For now, just log the files - in a real implementation, you'd upload them
    console.log("Files added:", files);
    // You could append file names to the prompt or handle upload logic here
    const fileNames = files.map((f) => f.name).join(", ");
    setInputValue((prev) =>
      prev ? `${prev}\n\nFiles: ${fileNames}` : `Files: ${fileNames}`,
    );
  }, []);

  // Step 4: Edit message handlers with error handling
  const handleEditMessage = (messageId: string) => {
    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        console.error("Message not found:", messageId);
        return;
      }
      // Use Zustand store for edit state management
      if (currentSession?.id) {
        const { setEditingMessage } = useChatStore.getState();
        setEditingMessage(currentSession.id, messageId);
      }
      setEditingMessageId(messageId);
      setEditContent(message.content);
      // Edit message action - use proper logger if needed
    } catch (error) {
      console.error("Error in handleEditMessage:", error);
    }
  };

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    try {
      if (!newContent.trim()) {
        console.warn("Cannot save empty message");
        return;
      }

      if (!currentSession?.id) {
        console.error("No current session for message edit");
        return;
      }

      // Call backend API to save edit
      await apiClient.editMessage(messageId, newContent, false); // Don't trigger regeneration by default

      // Update local state
      setEditingMessageId(null);

      // Update in Zustand store
      const { updateMessageContent, setEditingMessage } =
        useChatStore.getState();
      updateMessageContent(currentSession.id, messageId, newContent);
      setEditingMessage(currentSession.id, null);

      // Message edit saved - use proper logger if needed
    } catch (error) {
      console.error("Error in handleSaveEdit:", error);
      // Keep edit mode active on error
    }
  };

  const handleCancelEdit = () => {
    try {
      setEditingMessageId(null);
      setEditContent("");
      // Edit cancelled - use proper logger if needed
    } catch (error) {
      console.error("Error in handleCancelEdit:", error);
    }
  };

  // Step 5: Delete message handler with error handling
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const confirmDelete = window.confirm(
        "Delete this message and all subsequent responses?",
      );
      if (!confirmDelete) return;

      if (!currentSession?.id) {
        console.error("No current session for message deletion");
        return;
      }

      // Deleting message - use proper logger if needed

      // Call backend API to delete message
      await apiClient.deleteMessage(messageId);

      // Update in Zustand store (this will be handled by SSE events from backend)
      // But we can also update locally for immediate feedback
      const { deleteMessageAndSubsequent } = useChatStore.getState();
      deleteMessageAndSubsequent(currentSession.id, messageId);

      // Message deleted successfully - use proper logger if needed
    } catch (error) {
      console.error("Error in handleDeleteMessage:", error);
    }
  };

  // Step 6: Feedback handlers with error handling
  const handleUpvote = async (messageId: string) => {
    try {
      if (!currentSession?.id) {
        console.error("No current session for feedback");
        return;
      }

      const currentFeedback = messagesFeedback[messageId];
      const newFeedback = currentFeedback === "upvote" ? null : "upvote";

      // Update local state immediately for responsive UI
      setMessagesFeedback((prev) => ({
        ...prev,
        [messageId]: newFeedback,
      }));

      // Submit feedback to backend if not null
      if (newFeedback) {
        await apiClient.submitMessageFeedback(messageId, newFeedback);
      }

      // Update Zustand store
      const { updateFeedback } = useChatStore.getState();
      updateFeedback(currentSession.id, messageId, newFeedback);

      // Upvoted message - use proper logger if needed
    } catch (error) {
      console.error("Error in handleUpvote:", error);
      // Revert local state on error
      const originalFeedback = messagesFeedback[messageId];
      setMessagesFeedback((prev) => ({
        ...prev,
        [messageId]: originalFeedback,
      }));
    }
  };

  const handleDownvote = async (messageId: string) => {
    try {
      if (!currentSession?.id) {
        console.error("No current session for feedback");
        return;
      }

      const currentFeedback = messagesFeedback[messageId];
      const newFeedback = currentFeedback === "downvote" ? null : "downvote";

      // Update local state immediately for responsive UI
      setMessagesFeedback((prev) => ({
        ...prev,
        [messageId]: newFeedback,
      }));

      // Submit feedback to backend if not null
      if (newFeedback) {
        await apiClient.submitMessageFeedback(messageId, newFeedback);
      }

      // Update Zustand store
      const { updateFeedback } = useChatStore.getState();
      updateFeedback(currentSession.id, messageId, newFeedback);

      // Downvoted message - use proper logger if needed
    } catch (error) {
      console.error("Error in handleDownvote:", error);
      // Revert local state on error
      const originalFeedback = messagesFeedback[messageId];
      setMessagesFeedback((prev) => ({
        ...prev,
        [messageId]: originalFeedback,
      }));
    }
  };

  // Step 7: Regenerate message handler with error handling
  const handleRegenerateMessage = async (messageId: string) => {
    try {
      if (isStreaming) {
        console.warn("Cannot regenerate while streaming");
        return;
      }

      if (!currentSession?.id) {
        console.error("No current session for regeneration");
        return;
      }

      // Regenerating message - use proper logger if needed

      // Find the assistant message
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) {
        console.error("Message not found for regeneration:", messageId);
        return;
      }

      const message = messages[messageIndex];
      if (message.role !== "assistant") {
        console.error("Only assistant messages can be regenerated");
        return;
      }

      // Set thought process
      setThoughtProcess({
        messageId,
        status: "thinking",
        isVisible: true,
      });

      // Call backend API to regenerate message
      await apiClient.regenerateMessage(messageId);

      // The regeneration progress will be handled by SSE events
      // Update Zustand store to mark message as regenerating
      const { updateSessionMeta } = useChatStore.getState();
      updateSessionMeta(currentSession.id, {
        regeneratingMessageId: messageId,
      });

      // Regeneration started - use proper logger if needed
    } catch (error) {
      console.error("Error in handleRegenerateMessage:", error);
      // Reset thought process on error
      setThoughtProcess({
        messageId: null,
        status: null,
        isVisible: false,
      });
    }
  };

  const conversationTitle =
    currentSession?.title?.trim() ||
    currentSession?.messages[0]?.content.slice(0, 60) ||
    "Chat with Vana";
  const disableInput = isSubmitting || isStreaming;

  // Phase 3.3: Show loading/error states during session initialization
  if (!sessionReady) {
    if (sessionError) {
      return (
        <ErrorBoundary
          componentName="ChatView"
          allowRetry={true}
          showErrorDetails={false}
        >
          <PageTransition transitionKey="chat-error">
            <main className="flex h-screen flex-col overflow-hidden">
              <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 px-4 shadow-none">
                <SidebarTrigger className="-ml-1" />
                <div className="text-foreground">Chat Session Error</div>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" onClick={onExit}>
                    Back to Home
                  </Button>
                </div>
              </header>
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center max-w-md px-4">
                  <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
                    role="img"
                    aria-label="Error"
                  >
                    <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
                  </div>
                  <h3
                    className="mb-2 text-lg font-semibold text-destructive"
                    id="error-heading-chatview"
                  >
                    Failed to Initialize Chat Session
                  </h3>
                  <p
                    className="text-sm text-muted-foreground mb-6"
                    aria-describedby="error-heading-chatview"
                  >
                    {sessionError}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => {
                        setSessionError(null);
                        setSessionReady(false);
                        window.location.reload();
                      }}
                      className="px-6"
                    >
                      Retry
                    </Button>
                    <Button variant="outline" onClick={onExit}>
                      Go Home
                    </Button>
                  </div>
                </div>
              </div>
            </main>
          </PageTransition>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary
        componentName="ChatView"
        allowRetry={true}
        showErrorDetails={false}
      >
        <PageTransition transitionKey="chat-loading">
          <main className="flex h-screen flex-col overflow-hidden">
            <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 px-4 shadow-none">
              <SidebarTrigger className="-ml-1" />
              <div className="text-foreground">Initializing Chat...</div>
              <div className="ml-auto">
                <Button variant="ghost" size="sm" onClick={onExit}>
                  Back to Home
                </Button>
              </div>
            </header>
            <div className="flex flex-1 items-center justify-center">
              <div
                className="text-center"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <span className="sr-only">Initializing chat session, please wait</span>
                <div
                  className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
                  aria-hidden="true"
                ></div>
                <h2 className="text-2xl font-semibold mb-2">Initializing Chat</h2>
                <p className="text-muted-foreground">
                  Preparing your secure chat session
                </p>
              </div>
            </div>
          </main>
        </PageTransition>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      componentName="ChatView"
      allowRetry={true}
      showErrorDetails={false}
    >
      <PageTransition transitionKey={`chat-${currentSession?.id || 'loading'}`}>
        <main className="flex h-screen flex-col overflow-hidden">
        <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 px-4 shadow-none">
          <SidebarTrigger className="-ml-1" />
          <div className="text-foreground truncate" title={conversationTitle}>
            {conversationTitle}
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={onExit}>
              Back to Home
            </Button>
          </div>
        </header>

        {error ? (
          <div className="bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
          <ChatContainerRoot className="h-full">
            <ChatContainerContent className="space-y-0 px-5 py-12">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-2xl">💬</span>
                    </div>
                    <h3 className="mb-2 font-semibold">
                      Ready to start our conversation!
                    </h3>
                    <p className="text-sm">
                      Ask me anything or choose from the suggestions below.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isAssistant = message.role === "assistant";
                    const isLastMessage = index === messages.length - 1;

                    return (
                      <Message
                        key={message.id}
                        className={cn(
                          "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                          isAssistant ? "items-start" : "items-end",
                        )}
                      >
                        {isAssistant ? (
                          <div className="group flex w-full gap-3">
                            <MessageAvatar
                              src="/ai-avatar.png"
                              alt="AI Assistant"
                              fallback="AI"
                            />
                            <div className="flex w-full flex-col gap-0">
                              {/* Thought process display */}
                              {thoughtProcess &&
                                thoughtProcess.messageId === message.id &&
                                thoughtProcess.isVisible && (
                                  <MessageContent className="text-muted-foreground italic mb-2 opacity-80">
                                    <Loader
                                      variant="text-shimmer"
                                      text={
                                        thoughtProcess.status === "thinking"
                                          ? "Thinking..."
                                          : "Processing..."
                                      }
                                    />
                                  </MessageContent>
                                )}
                              <MessageContent className="prose flex-1 rounded-lg bg-transparent p-0">
                                <Markdown
                                  id={message.id}
                                  className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
                                >
                                  {message.content}
                                </Markdown>
                              </MessageContent>
                              <MessageActions
                                className={cn(
                                  "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                  isLastMessage && "opacity-100",
                                )}
                              >
                              <MessageAction tooltip="Copy" delayDuration={100}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    handleCopyMessage(message.content)
                                  }
                                >
                                  <Copy />
                                </Button>
                              </MessageAction>
                              <MessageAction
                                tooltip="Regenerate response"
                                delayDuration={100}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    handleRegenerateMessage(message.id)
                                  }
                                  disabled={isStreaming}
                                >
                                  <RefreshCw />
                                </Button>
                              </MessageAction>
                              <MessageAction
                                tooltip="Upvote"
                                delayDuration={100}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "rounded-full",
                                    messagesFeedback[message.id] === "upvote" &&
                                      "text-success bg-success/10",
                                  )}
                                  onClick={() => handleUpvote(message.id)}
                                >
                                  <ThumbsUp />
                                </Button>
                              </MessageAction>
                              <MessageAction
                                tooltip="Downvote"
                                delayDuration={100}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "rounded-full",
                                    messagesFeedback[message.id] ===
                                      "downvote" && "text-status-error bg-status-error/10",
                                  )}
                                  onClick={() => handleDownvote(message.id)}
                                >
                                  <ThumbsDown />
                                </Button>
                              </MessageAction>
                              </MessageActions>
                            </div>
                          </div>
                        ) : (
                          <div className="group flex gap-3 flex-row-reverse items-start w-full">
                            <MessageAvatar
                              src="/user-avatar.png"
                              alt="User"
                              fallback="U"
                            />
                            <div className="flex flex-col items-end gap-1 w-full">
                            {/* Edit mode UI switching */}
                            {editingMessageId === message.id ? (
                              <div className="w-full max-w-[85%] sm:max-w-[75%]">
                                <PromptInput
                                  value={editContent}
                                  onValueChange={setEditContent}
                                  onSubmit={() =>
                                    handleSaveEdit(message.id, editContent)
                                  }
                                  className="rounded-2xl"
                                >
                                  <PromptInputTextarea
                                    placeholder="Edit your message"
                                    className="min-h-[40px] px-4 py-2"
                                  />
                                  <PromptInputActions>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleSaveEdit(message.id, editContent)
                                      }
                                    >
                                      Save
                                    </Button>
                                  </PromptInputActions>
                                </PromptInput>
                              </div>
                            ) : (
                              <MessageContent className="min-w-fit max-w-[95%] rounded-3xl bg-muted px-5 py-2.5 text-foreground sm:max-w-[90%] md:max-w-[85%]">
                                {message.content}
                              </MessageContent>
                            )}
                            <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              <MessageAction tooltip="Edit" delayDuration={100}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() => handleEditMessage(message.id)}
                                >
                                  <Pencil />
                                </Button>
                              </MessageAction>
                              <MessageAction
                                tooltip="Delete"
                                delayDuration={100}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    handleDeleteMessage(message.id)
                                  }
                                >
                                  <Trash />
                                </Button>
                              </MessageAction>
                              <MessageAction tooltip="Copy" delayDuration={100}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                  onClick={() =>
                                    handleCopyMessage(message.content)
                                  }
                                >
                                  <Copy />
                                </Button>
                              </MessageAction>
                            </MessageActions>
                            </div>
                          </div>
                        )}
                      </Message>
                    );
                  })}
                </>
              )}
            </ChatContainerContent>
            <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
              <ScrollButton className="shadow-sm" />
            </div>
          </ChatContainerRoot>
        </div>

        <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
          <div className="mx-auto max-w-3xl">
            {/* Validation Error Display */}
            {validationError && validationError.trim() && (
              <div
                className="mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive"
                role="alert"
                aria-live="polite"
                data-testid="validation-error"
              >
                <span className="font-medium">⚠️ Validation Error:</span>{" "}
                {validationError}
              </div>
            )}

            {/* Character Counter */}
            {inputValue.length > 3500 && (
              <div className="mb-2 flex items-center justify-end gap-2 px-2 text-sm">
                <span
                  className={cn(
                    "font-medium",
                    characterStatus.status === "error" && "text-status-error",
                    characterStatus.status === "caution" && "text-warning",
                    characterStatus.status === "warning" && "text-warning",
                    characterStatus.status === "safe" && "text-success",
                  )}
                >
                  {characterStatus.message}
                </span>
                <span className="text-muted-foreground">
                  {inputValue.length}/4000
                </span>
              </div>
            )}

            <PromptInput
              isLoading={disableInput}
              value={inputValue}
              onValueChange={setInputValue}
              onSubmit={handleSubmit}
              className={cn(
                "border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs",
                validationError && "border-destructive",
              )}
            >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder="Ask anything"
                  className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                />

                <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <FileUpload onFilesAdded={handleFilesAdded} accept="*">
                      <FileUploadTrigger>
                        <PromptInputAction tooltip="Upload files">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-full"
                          >
                            <Plus size={18} />
                          </Button>
                        </PromptInputAction>
                      </FileUploadTrigger>
                    </FileUpload>
                  </div>
                  <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="Voice input">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        disabled
                      >
                        <Mic size={18} />
                      </Button>
                    </PromptInputAction>

                    <Button
                      size="icon"
                      disabled={!inputValue.trim() || disableInput}
                      onClick={() => handleSubmit()}
                      className="size-9 rounded-full"
                    >
                      <ArrowUp size={18} />
                    </Button>
                  </div>
                </PromptInputActions>
              </div>
            </PromptInput>
          </div>
        </div>
      </main>
      </PageTransition>
    </ErrorBoundary>
  );
}

function ChatLoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  );
}

function HomeView({
  onStartChat,
  isBusy,
  autoFocus,
}: {
  onStartChat: (prompt: string) => void;
  isBusy: boolean;
  autoFocus: boolean;
}) {
  return (
    <ErrorBoundary
      componentName="HomeView"
      allowRetry={true}
      showErrorDetails={false}
    >
      <PageTransition transitionKey="home">
        <div className="flex h-full flex-col">
        <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 px-4 shadow-none">
          <SidebarTrigger className="-ml-1" />
          <div className="text-foreground">Home</div>
        </header>
        <div className="flex flex-1 items-center justify-center overflow-auto">
          <VanaHomePage onStartChat={onStartChat} isBusy={isBusy} autoFocus={autoFocus} />
        </div>
      </div>
      </PageTransition>
    </ErrorBoundary>
  );
}

function HomePageContent() {
  const chat = useChatStream();
  const sessions = chat.getAllSessions();
  const searchParams = useSearchParams();

  // Check if we should auto-focus the input (e.g., from "New Chat" button)
  const shouldAutoFocus = searchParams.get('focus') === 'true';

  // Phase 3.3: Session pre-creation state
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Clear session on mount to always show home page when navigating to /
  useEffect(() => {
    chat.switchSession(null);
    // Mark as ready immediately - CSRF will be fetched when user sends first message
    setSessionReady(true);
    setSessionError(null);
  }, []); // Empty dependency array = run only once on mount

  // Use refs to access chat methods without dependency on chat object
  const chatRef = useRef(chat);
  chatRef.current = chat;

  const handleStartChat = useCallback(async (prompt: string) => {
    try {
      const { switchOrCreateSession, currentSessionId } = useChatStore.getState();

      // Ensure session exists (should already exist from mount, but defensive check)
      if (!currentSessionId) {
        console.log('[HomePage] Creating session before sending message');
        await switchOrCreateSession();
      }

      const currentChat = chatRef.current;
      if (!currentChat) {
        console.error('[HomePage] Chat ref not available');
        return;
      }

      // Session guaranteed to exist now, send message
      console.log('[HomePage] Sending message with session:', currentSessionId);
      await currentChat.sendMessage(prompt);

    } catch (error) {
      console.error('[HomePage] Failed to start chat:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to start chat';
      setSessionError(errorMsg);
    }
  }, []);

  const handleCreateSession = useCallback(() => {
    const { switchOrCreateSession, currentSessionId } = useChatStore.getState();

    // Fire-and-forget async session creation
    switchOrCreateSession().catch(error => {
      console.error('[HomePage] Session creation error:', error);
      setSessionError('Failed to create session');
    });

    // Return current session ID immediately (synchronous for VanaSidebar)
    return currentSessionId || '';
  }, []);

  const handleSelectSession = (sessionId: string) => {
    chat.switchSession(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Delete from backend
      const result = await apiClient.deleteSession(sessionId);
      if (result.success) {
        // Delete from local store
        useChatStore.getState().deleteSession(sessionId);
        // Session deleted successfully - use proper logger if needed
      } else {
        console.error("Failed to delete session:", result.message);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleExitChat = () => {
    chat.switchSession(null);
  };

  const handleClearSession = () => {
    chat.switchSession(null);
  };

  const isChatActive = Boolean(chat.sessionId);

  // Phase 3.3: Show error if session creation failed
  if (sessionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
            role="img"
            aria-label="Error"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h2
            className="text-2xl font-semibold mb-2"
            id="error-heading-homepage"
          >
            Session Error
          </h2>
          <p
            className="text-muted-foreground mb-6"
            aria-describedby="error-heading-homepage"
          >
            {sessionError}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="default"
            >
              Retry
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 3.3: Show loading while CSRF token is being fetched
  if (!sessionReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div
          className="text-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">Loading, please wait</span>
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
            aria-hidden="true"
          ></div>
          <h2 className="text-2xl font-semibold mb-2">Loading</h2>
          <p className="text-muted-foreground">
            Preparing your session
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      componentName="HomePage"
      allowRetry={true}
      showErrorDetails={false}
      showHomeButton={false}
    >
      <div className="flex h-screen w-full">
        <ErrorBoundary
          componentName="VanaSidebar"
          allowRetry={true}
          showErrorDetails={false}
        >
          <VanaSidebar
            sessions={sessions}
            activeSessionId={chat.sessionId}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
            onClearSession={handleClearSession}
          />
        </ErrorBoundary>
        <SidebarInset>
          {isChatActive ? (
            <Suspense fallback={<ChatLoadingSkeleton />}>
              <ChatView chat={chat} onExit={handleExitChat} />
            </Suspense>
          ) : (
            <HomeView onStartChat={handleStartChat} isBusy={chat.isStreaming} autoFocus={shouldAutoFocus} />
          )}
        </SidebarInset>
      </div>
    </ErrorBoundary>
  );
}

// Wrap with Suspense for useSearchParams() compatibility
export default function HomePage() {
  return (
    <Suspense fallback={<ChatLoadingSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
