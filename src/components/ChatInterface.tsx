import { useState, useRef, useEffect, useCallback, MutableRefObject } from "react";
import { Copy, Pencil, RotateCw, Maximize2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { ensureValidSession } from "@/utils/authHelpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "motion/react";
import { scaleIn, ANIMATION_DURATIONS, ANIMATION_EASINGS } from "@/utils/animationConstants";
import { CHAT_SPACING, SAFE_AREA_SPACING, combineSpacing } from "@/utils/spacingConstants";
import { MessageSkeleton } from "@/components/ui/message-skeleton";
import { ArtifactCardSkeleton } from "@/components/ArtifactCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import {
  Message as MessageComponent,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/prompt-kit/message";
import {
  PromptInput,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Markdown } from "@/components/ui/markdown";
import { useChatMessages, ChatMessage, type StreamProgress } from "@/hooks/useChatMessages";
import { useStreamCancellation } from "@/hooks/useStreamCancellation";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArtifactContainer as Artifact, ArtifactData } from "@/components/ArtifactContainer";
import { MessageWithArtifacts } from "@/components/MessageWithArtifacts";
import { parseArtifacts } from "@/utils/artifactParser";
import { bundleArtifact } from "@/utils/artifactBundler";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { ReasoningDisplay } from "@/components/ReasoningDisplay";
import { ReasoningErrorBoundary } from "@/components/ReasoningErrorBoundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { SystemMessage } from "@/components/ui/system-message";
import { RateLimitPopup } from "@/components/RateLimitPopup";
import { useNavigate } from "react-router-dom";
import { TOUR_STEP_IDS } from "@/components/tour";

interface ChatInterfaceProps {
  sessionId?: string;
  initialPrompt?: string;
  initialImageMode?: boolean;
  initialArtifactMode?: boolean;
  isCanvasOpen?: boolean;
  onCanvasToggle?: (isOpen: boolean) => void;
  onArtifactChange?: (hasContent: boolean) => void;
  input?: string;
  onInputChange?: (value: string) => void;
  onSendMessage?: (handleSend: (message?: string) => Promise<void>) => void;
  onInitialPromptSent?: () => void;
  isGuest?: boolean;
  guestMessageCount?: number;
  guestMaxMessages?: number;
  guestSession?: {
    saveMessages: (messages: ChatMessage[]) => void;
    loadMessages: () => ChatMessage[];
    clearMessages: () => void;
  };
}

export function ChatInterface({
  sessionId,
  initialPrompt,
  initialImageMode = false,
  initialArtifactMode = false,
  isCanvasOpen = false,
  onCanvasToggle,
  onArtifactChange,
  input: parentInput,
  onInputChange: parentOnInputChange,
  onSendMessage,
  onInitialPromptSent,
  isGuest = false,
  guestMessageCount = 0,
  guestMaxMessages = 10,
  guestSession
}: ChatInterfaceProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { messages, isLoading, streamChat, deleteMessage, updateMessage, artifactRenderStatus, rateLimitPopup, setRateLimitPopup } = useChatMessages(sessionId, { isGuest, guestSession });
  const { cancelStream, startStream, completeStream } = useStreamCancellation();
  const [localInput, setLocalInput] = useState("");
  const input = typeof parentInput === 'string' ? parentInput : localInput;
  const setInput = parentOnInputChange ?? setLocalInput;
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // Track elapsed time for the last streamed message (preserved after streaming ends)
  const [lastMessageElapsedTime, setLastMessageElapsedTime] = useState<string>("");
  const streamingStartTimeRef = useRef<number | null>(null);
  const elapsedTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamProgress, setStreamProgress] = useState<StreamProgress>({
    stage: "analyzing",
    message: "Analyzing request...",
    artifactDetected: false,
    percentage: 0
  });
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);
  const [artifactOverrides, setArtifactOverrides] = useState<Record<string, Partial<ArtifactData>>>({});
  const [isEditingArtifact, setIsEditingArtifact] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [imageMode, setImageMode] = useState(initialImageMode);
  const [artifactMode, setArtifactMode] = useState(initialArtifactMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const bundleReactFallbackAttemptsRef = useRef<Set<string>>(new Set());
  // Ref to store handleSend for stable access in effects (prevents re-triggering initialPrompt effect)
  const handleSendRef = useRef<((message?: string) => Promise<void>) | null>(null);
  // Track which session+prompt combination has been initialized (using ref to avoid stale closure issues)
  const initializedSessionRef = useRef<string | null>(null);

  // Memoized artifact open handler to prevent breaking MessageWithArtifacts memo
  const handleArtifactOpen = useCallback((artifact: ArtifactData) => {
    setCurrentArtifact(artifact);
    if (onCanvasToggle) {
      onCanvasToggle(true);
    }
  }, [onCanvasToggle]);

  const handleBundleReactFallback = useCallback(async (artifact: ArtifactData, errorMessage: string) => {
    if (!sessionId) {
      toast({
        title: "Unable to retry bundling",
        description: "Session is missing. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (artifact.type !== "react" || !artifact.bundleUrl) {
      return;
    }

    const attempts = bundleReactFallbackAttemptsRef.current;
    if (attempts.has(artifact.id)) {
      return;
    }
    attempts.add(artifact.id);

    toast({
      title: `Retrying ${artifact.title} with ESM React`,
      description: "This should resolve missing ReactDOM exports.",
    });

    const result = await bundleArtifact(
      artifact.content,
      artifact.id,
      sessionId,
      artifact.title,
      true,
      true
    );

    if (result.success) {
      const update = {
        bundleUrl: result.bundleUrl,
        bundleTime: result.bundleTime,
        dependencies: result.dependencies,
        bundlingFailed: false,
        bundleError: undefined,
        bundleErrorDetails: undefined,
        bundleStatus: 'success' as const,
      };

      setArtifactOverrides(prev => ({
        ...prev,
        [artifact.id]: {
          ...prev[artifact.id],
          ...update,
        }
      }));

      setCurrentArtifact(prev => (prev?.id === artifact.id ? { ...prev, ...update } : prev));

      toast({
        title: `${artifact.title} re-bundled with ESM React`,
      });
    } else {
      toast({
        title: `ESM React bundling failed for ${artifact.title}`,
        description: result.details || result.error || errorMessage,
        variant: "destructive",
      });
    }
  }, [sessionId]);

  // Define handleSend early using useCallback to avoid initialization errors
  const handleSend = useCallback(async (message?: string) => {
    const messageToSend = message || input;

    if (typeof messageToSend !== 'string' || !messageToSend.trim() || isLoading || isStreaming) {
      return;
    }

    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");

    // IMPORTANT: Only force tool choice for explicit image generation mode
    // For artifacts, use "auto" and let GLM decide based on the prompt
    // This prevents tool execution failures when prompts don't match tool expectations
    const toolChoice = imageMode ? "generate_image" : "auto";
    console.log("🎯 [ChatInterface.handleSend] Tool choice:", {
      imageMode,
      artifactMode,
      toolChoice,
    });
    // NOTE: setImageMode/setArtifactMode moved to useEffect below to prevent render phase updates

    // Start stream with cancellation support
    const abortController = startStream();

    // Increment tracker to trigger mode reset
    setMessageSentTracker(prev => prev + 1);

    await streamChat(
      messageToSend,
      (chunk, progress) => {
        // Only append text chunks (ignore empty chunks from reasoning updates)
        if (chunk) {
          setStreamingMessage((prev) => prev + chunk);
        }
        // Always update progress (includes reasoning steps)
        setStreamProgress(progress);
      },
      () => {
        setStreamingMessage("");
        setIsStreaming(false);
        setIsEditingArtifact(false);
        // CRITICAL FIX: Preserve reasoning data when streaming completes!
        // Only update stage/message, keep reasoningSteps/streamingReasoningText/reasoningStatus
        // This prevents the "No reasoning data available" bug where reasoning is lost after generation
        setStreamProgress((prevProgress) => ({
          ...prevProgress,
          stage: "complete",
          message: "",
          percentage: 100,
          // Preserved automatically: reasoningSteps, streamingReasoningText, reasoningStatus, toolExecution
        }));
        completeStream();
      },
      currentArtifact && isEditingArtifact ? currentArtifact : undefined,
      toolChoice,
      0, // retryCount
      abortController.signal
    );
  }, [input, isLoading, isStreaming, setInput, streamChat, currentArtifact, isEditingArtifact, imageMode, artifactMode, startStream, completeStream]);

  // Keep ref updated with latest handleSend (for stable access in effects)
  handleSendRef.current = handleSend;

  // Track when messages are sent to reset image/artifact modes
  const [messageSentTracker, setMessageSentTracker] = useState(0);

  // Reset modes when a message is sent (moved from handleSend to prevent render phase updates)
  useEffect(() => {
    setImageMode(false);
    setArtifactMode(false);
  }, [messageSentTracker]);

  // Reset when session changes
  useEffect(() => {
    cancelStream();
    setStreamingMessage("");
    setIsStreaming(false);
    setCurrentArtifact(null);
    setIsEditingArtifact(false);
    setLastMessageElapsedTime("");
    setArtifactOverrides({});
    bundleReactFallbackAttemptsRef.current.clear();
    onArtifactChange?.(false);
    setMessageSentTracker(0); // Reset tracker
    setImageMode(false);
    setArtifactMode(false);
    // Note: initializedSessionRef is managed separately in the initialPrompt effect
  }, [sessionId, cancelStream, onArtifactChange]);

  // Timer effect: Start timer when streaming begins, capture final time when streaming ends
  useEffect(() => {
    if (isStreaming) {
      // Start streaming - begin timing
      streamingStartTimeRef.current = Date.now();
      setLastMessageElapsedTime(""); // Reset for new stream

      // Update elapsed time every second
      elapsedTimeIntervalRef.current = setInterval(() => {
        if (streamingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - streamingStartTimeRef.current) / 1000);
          if (elapsed < 60) {
            setLastMessageElapsedTime(`${elapsed}s`);
          } else {
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            setLastMessageElapsedTime(`${minutes}m ${seconds}s`);
          }
        }
      }, 1000);
    } else {
      // Streaming ended - stop timer but KEEP the final elapsed time
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
      // Don't reset lastMessageElapsedTime - keep it for display
      streamingStartTimeRef.current = null;
    }

    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  // Expose handleSend to parent component
  useEffect(() => {
    if (onSendMessage) {
      onSendMessage(handleSend);
    }
  }, [onSendMessage, handleSend]);

  useEffect(() => {
    // Allow auto-send for both authenticated (with sessionId) AND guests (without sessionId)
    // Uses handleSendRef to avoid dependency on handleSend (which changes on every render cycle)
    // Uses initializedSessionRef to track which session has been initialized (ref avoids stale state issues)
    if (!initialPrompt || !handleSendRef.current) {
      return;
    }

    // Create a unique key for this session+prompt combination
    const initKey = `${sessionId || 'guest'}:${initialPrompt}`;

    // Skip if we've already initialized this exact session+prompt
    if (initializedSessionRef.current === initKey) {
      return;
    }

    // Mark as initialized BEFORE sending to prevent re-entry
    initializedSessionRef.current = initKey;

    // Send the initial prompt
    handleSendRef.current(initialPrompt);

    // Notify parent that initial prompt has been sent
    onInitialPromptSent?.();
  }, [sessionId, initialPrompt, onInitialPromptSent]);

  // Parse artifacts from messages (removed auto-open behavior)
  useEffect(() => {
    const allMessages = [...messages];
    if (streamingMessage) {
      allMessages.push({
        id: 'streaming-temp',
        session_id: sessionId || '',
        role: "assistant" as const,
        content: streamingMessage,
        created_at: new Date().toISOString()
      });
    }

    // Get the last assistant message
    const lastAssistantMsg = [...allMessages].reverse().find(m => m.role === "assistant");
    if (lastAssistantMsg) {
      parseArtifacts(lastAssistantMsg.content).then(({ artifacts }) => {
        if (artifacts.length > 0) {
          // Set artifact but don't auto-open canvas
          // User will click "Open" button on artifact card to open
          onArtifactChange?.(true);
        } else {
          onArtifactChange?.(false);
        }
      });
    } else {
      onArtifactChange?.(false);
    }
  }, [messages, streamingMessage, onArtifactChange, sessionId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      // Validate file with comprehensive checks
      const validationResult = await validateFile(file);
      if (!validationResult.valid) {
        toast({ title: validationResult.error || "File validation failed", variant: "destructive" });
        return;
      }

      const session = await ensureValidSession();
      if (!session) {
        toast({ title: "Authentication required. Please refresh the page or sign in again.", variant: "destructive" });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();

      // Sanitize filename and create upload path
      const sanitized = sanitizeFilename(file.name);
      const fileExt = sanitized.substring(sanitized.lastIndexOf('.'));
      const fileName = `${user.id}/${Date.now()}${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL (7 days expiry) for private bucket access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(fileName, 604800); // 7 days = 604800 seconds

      if (urlError) {
        throw new Error(`Failed to generate secure URL: ${urlError.message}`);
      }

      if (!signedUrlData?.signedUrl) {
        throw new Error('Failed to generate secure URL: No URL returned from storage service');
      }

      // Add file reference to input
      setInput(`${input}\n[${file.name}](${signedUrlData.signedUrl})`);

      toast({ title: "File uploaded successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("File upload error:", {
        error: errorMessage,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });

      // Provide user-friendly error message based on the error type
      if (errorMessage.includes('secure URL')) {
        toast({ title: `Upload succeeded but URL generation failed: ${errorMessage}`, variant: "destructive" });
      } else if (errorMessage.includes('File too large')) {
        toast({ title: 'File is too large. Maximum size is 100MB.', variant: "destructive" });
      } else if (errorMessage.includes('Invalid file type')) {
        toast({ title: 'Invalid file type. Supported types: images, documents, text files.', variant: "destructive" });
      } else {
        toast({ title: `Failed to upload file: ${errorMessage}`, variant: "destructive" });
      }
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateClick = () => {
    if (!currentArtifact) {
      // No artifact exists - insert "Help me create" into prompt
      setInput("Help me create ");
    } else if (isCanvasOpen) {
      // Canvas is open - close it
      onCanvasToggle?.(false);
    } else {
      // Canvas exists but closed - open it
      onCanvasToggle?.(true);
    }
  };

  const handleEditArtifact = (suggestion?: string) => {
    setIsEditingArtifact(true);
    if (suggestion) {
      setInput(suggestion);
    }
    // Focus will naturally go to input
  };
  const handleCloseCanvas = () => {
    onCanvasToggle?.(false);
  };

  // Message action handlers
  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied to clipboard" });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }, []);

  const handleRetry = useCallback(async (messageId: string) => {
    if (isLoading || isStreaming) {
      return;
    }

    // Find the message to retry and the user message before it
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) {
      toast({
        title: "Cannot retry",
        description: "No previous message found",
        variant: "destructive"
      });
      return;
    }

    // Get the failed assistant message and the user message before it
    const failedMessage = messages[messageIndex];
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== "user") {
      toast({
        title: "Cannot retry",
        description: "Previous message is not a user message",
        variant: "destructive"
      });
      return;
    }

    try {
      // Delete the assistant message
      await deleteMessage(messageId);

      // Regenerate the response by resending the user message
      setIsStreaming(true);
      setStreamingMessage("");

      // Start stream with cancellation support
      const abortController = startStream();

      await streamChat(
        userMessage.content,
        (chunk, progress) => {
          if (chunk) {
            setStreamingMessage((prev) => prev + chunk);
          }
          setStreamProgress(progress);
        },
        () => {
          setStreamingMessage("");
          setIsStreaming(false);
          setStreamProgress({
            stage: "complete",
            message: "",
            artifactDetected: false,
            percentage: 100
          });
          completeStream();
        },
        currentArtifact && isEditingArtifact ? currentArtifact : undefined,
        "auto",
        0, // retryCount
        abortController.signal
      );

      toast({
        title: "Regenerating response",
        description: "Creating a new response to your message"
      });
    } catch (error) {
      console.error("Failed to retry:", error);
      toast({
        title: "Failed to retry",
        description: "Could not regenerate the response",
        variant: "destructive"
      });
    }
  }, [messages, isLoading, isStreaming, deleteMessage, streamChat, currentArtifact, isEditingArtifact, startStream, completeStream]);

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setInput(content);
    toast({
      title: "Editing message",
      description: "Make your changes and press Enter to update"
    });
  }, [setInput]);


  // Render chat content (messages + input) - reusable for both mobile and desktop
  const renderChatContent = () => (
    <div className="flex flex-1 flex-col min-h-0 px-4 pt-4 pb-4">
      {/* Guest mode banner - only show when 3 or fewer messages remaining */}
      {isGuest && messages.length > 0 && (guestMaxMessages - guestMessageCount) <= 3 && (
        <div className="mx-auto w-full max-w-5xl mb-3">
          <SystemMessage
            variant="action"
            fill
            cta={{
              label: "Sign In",
              onClick: () => navigate("/auth")
            }}
            className="text-xs py-1.5 pr-1.5 pl-2.5"
          >
            {guestMessageCount < guestMaxMessages ? (
              <><strong>{guestMaxMessages - guestMessageCount}</strong> free message{guestMaxMessages - guestMessageCount !== 1 ? 's' : ''} left. Sign in for more!</>
            ) : (
              <>Free limit reached. Sign in to continue!</>
            )}
          </SystemMessage>
        </div>
      )}

      {/* Chat content - transparent to show unified parent container */}
      <div className="relative flex flex-1 min-h-0 w-full">
        <ChatContainerRoot className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <ChatContainerContent
            className={combineSpacing(
              "w-full",
              CHAT_SPACING.messageList,
              CHAT_SPACING.message.gap,
              // Extra bottom padding on mobile to ensure artifact cards are fully visible above prompt input
              "pb-24 md:pb-6"
            )}
            aria-label="Chat conversation"
            data-testid="message-list"
          >

            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLastMessage = index === messages.length - 1;

              // Only animate new messages (last message when not streaming)
              // This prevents performance issues with long chat histories
              const shouldAnimate = isLastMessage && !isStreaming;
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

              const messageContent = (
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
                        onArtifactOpen={handleArtifactOpen}
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
                              className="h-8 w-8 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                              onClick={() => handleRetry(message.id)}
                              disabled={isLoading || isStreaming}
                              aria-label="Regenerate response"
                            >
                              <RotateCw className="h-4 w-4 md:h-3 md:w-3 text-muted-foreground/60" />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                              onClick={() => handleCopyMessage(message.content)}
                              aria-label="Copy message content"
                            >
                              <Copy className="h-4 w-4 md:h-3 md:w-3 text-muted-foreground/60" />
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
                              className="h-8 w-8 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                              onClick={() => handleEditMessage(message.id, message.content)}
                              aria-label="Edit message"
                            >
                              <Pencil className="h-4 w-4 md:h-3 md:w-3 text-muted-foreground/60" />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 md:h-6 md:w-6 rounded-sm hover:bg-muted/50"
                              onClick={() => handleCopyMessage(message.content)}
                              aria-label="Copy message content"
                            >
                              <Copy className="h-4 w-4 md:h-3 md:w-3 text-muted-foreground/60" />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    </div>
                  )}
                </MessageComponent>
              );

              // Wrap with motion animation only for new messages to optimize performance
              return shouldAnimate ? (
                <motion.div
                  key={message.id}
                  className="will-change-transform transform-gpu"
                  {...scaleIn}
                  transition={{
                    duration: ANIMATION_DURATIONS.moderate,
                    ease: ANIMATION_EASINGS.easeOut,
                  }}
                >
                  {messageContent}
                </motion.div>
              ) : (
                <div key={message.id}>{messageContent}</div>
              );
            })}

            {isStreaming && (
              <MessageComponent
                className={cn(
                  "mx-auto flex w-full max-w-5xl flex-col items-start",
                  CHAT_SPACING.message.container
                )}
              >
                <div className="flex w-full flex-col gap-2">
                  {/* Assistant header with icon and name */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Vana</span>
                  </div>

                  {/* Always show reasoning during streaming, even if no data yet */}
                  <ReasoningErrorBoundary fallback={<ThinkingIndicator status="Loading reasoning..." />}>
                    <ReasoningDisplay
                      streamingReasoningText={streamProgress.streamingReasoningText}
                      reasoningStatus={streamProgress.reasoningStatus}
                      isStreaming={true}
                      artifactRendered={artifactRenderStatus === 'rendered' || artifactRenderStatus === 'error'}
                      onStop={cancelStream}
                      parentElapsedTime={lastMessageElapsedTime}
                      toolExecution={streamProgress.toolExecution}
                    />
                  </ReasoningErrorBoundary>
                  {/* Show content immediately - reasoning is supplementary context, not blocking */}
                  {streamingMessage ? (
                    <MessageWithArtifacts
                      content={streamingMessage}
                      sessionId={sessionId || ''}
                      onArtifactOpen={handleArtifactOpen}
                      artifactOverrides={artifactOverrides}
                      searchResults={streamProgress.searchResults}
                    />
                  ) : (
                    /* Text skeleton while waiting for content to arrive */
                    <div
                      role="status"
                      aria-label="Preparing response"
                      className="space-y-2 mt-2"
                    >
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/5" />
                      <span className="sr-only">Preparing response</span>
                    </div>
                  )}

                  {/* Show artifact skeleton during generate_artifact tool execution */}
                  {/* Keep skeleton visible until the artifact tag is fully closed in streaming content */}
                  {streamProgress.toolExecution?.toolName === 'generate_artifact' &&
                    !streamingMessage.includes('</artifact>') && (
                      <ArtifactCardSkeleton className="mt-3 mx-6" />
                    )}

                  {/* Show image skeleton during generate_image tool execution */}
                  {streamProgress.toolExecution?.toolName === 'generate_image' &&
                    streamProgress.toolExecution?.success === undefined && (
                      <div className="my-4 mx-6 max-w-md">
                        <div
                          className="relative rounded-xl overflow-hidden border-2 border-border"
                          role="status"
                          aria-label="Generating image"
                        >
                          <Skeleton className="h-96 w-full" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                              Generating image...
                            </div>
                          </div>
                          <span className="sr-only">Generating image</span>
                        </div>
                      </div>
                    )}
                </div>
              </MessageComponent>
            )}

            {/* Show skeleton only when loading but not yet streaming */}
            {isLoading && !isStreaming && (
              <MessageSkeleton variant="assistant" />
            )}
          </ChatContainerContent>

          <div className="absolute bottom-4 right-4">
            <ScrollButton className="shadow-sm" />
          </div>

          {/* Prompt Input - embedded within chat card */}
          <div className={combineSpacing("shrink-0 bg-transparent safe-mobile-input px-4 pb-4", SAFE_AREA_SPACING.bottom)}>
            <PromptInput
              id={TOUR_STEP_IDS.CHAT_INPUT}
              value={input}
              onValueChange={setInput}
              isLoading={isLoading || isStreaming}
              onSubmit={handleSend}
              className="w-full relative rounded-xl bg-black/70 backdrop-blur-sm p-0 pt-1"
            >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder="Ask anything"
                  className={combineSpacing("min-h-[44px] text-base leading-[1.3]", CHAT_SPACING.input.textarea)}
                />
                <PromptInputControls
                  className="mt-5 px-3 pb-3"
                  imageMode={imageMode}
                  onImageModeChange={setImageMode}
                  artifactMode={artifactMode}
                  onArtifactModeChange={setArtifactMode}
                  isCanvasOpen={isCanvasOpen}
                  currentArtifact={currentArtifact}
                  onCreateClick={handleCreateClick}
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  input={input}
                  onSend={() => handleSend()}
                  onStop={cancelStream}
                  showFileUpload={true}
                  fileInputRef={fileInputRef}
                  isUploadingFile={isUploadingFile}
                  onFileUpload={handleFileUpload}
                  sendIcon="arrow"
                />
              </div>
            </PromptInput>
          </div>
        </ChatContainerRoot>
      </div>
    </div>
  );

  return (
    <>
      <RateLimitPopup
        isOpen={rateLimitPopup.isOpen}
        resetAt={rateLimitPopup.resetAt}
        onSignIn={() => navigate("/auth")}
        onDismiss={() => setRateLimitPopup({ isOpen: false, resetAt: undefined })}
      />
      <div className="flex flex-1 flex-col min-h-0">
        {isMobile ? (
          // Mobile Layout: Fullscreen artifact overlay or chat
          // Glass card container matches desktop styling for visual consistency
          // Bottom margin accounts for Safari toolbar + safe area to prevent keyboard blank space
          <div className={cn(
            "flex flex-col flex-1 min-h-0 mx-3 mt-3 mb-[calc(0.75rem+env(safe-area-inset-bottom))] overflow-hidden rounded-2xl",
            "bg-black/60 backdrop-blur-md border border-white/10 shadow-xl",
            "ring-1 ring-white/5"
          )}>
            {isCanvasOpen && currentArtifact ? (
              // Mobile: Fullscreen artifact
              <div className="fixed inset-0 z-50 bg-background">
                <Artifact
                  artifact={currentArtifact}
                  onClose={handleCloseCanvas}
                  onEdit={handleEditArtifact}
                  onBundleReactFallback={handleBundleReactFallback}
                  onContentChange={(newContent) => {
                    setCurrentArtifact({ ...currentArtifact, content: newContent });
                  }}
                />
              </div>
            ) : (
              // Mobile: Chat with floating artifact button
              <>
                {renderChatContent()}
                {currentArtifact && !isCanvasOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 hover:brightness-110 hover:-translate-y-0.5 transition-all"
                        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
                        onClick={() => onCanvasToggle?.(true)}
                      >
                        <Maximize2 className="h-6 w-6 text-white" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Artifact</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        ) : (
          // Desktop Layout: Side-by-side resizable panels with Gemini-style sizing (30/70 split)
          // UNIFIED CONTAINER: Single glass-morphic box wrapping both chat and canvas
          <div className={cn(
            "flex-1 min-h-0 mx-4 my-4 overflow-hidden rounded-3xl",
            "bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl",
            // Add subtle glow effect for visual prominence
            "ring-1 ring-white/5"
          )}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel
                id="chat-panel"
                order={1}
                defaultSize={isCanvasOpen && currentArtifact ? 30 : 100}
                minSize={20}
                maxSize={isCanvasOpen && currentArtifact ? 50 : 100}
                className="md:min-w-[280px] flex flex-col"
              >
                {renderChatContent()}
              </ResizablePanel>

              <ResizableHandle
                withHandle
                className={`hidden md:flex ${!isCanvasOpen || !currentArtifact ? 'invisible' : ''}`}
              />
              <ResizablePanel
                id="canvas-panel"
                order={2}
                defaultSize={isCanvasOpen && currentArtifact ? 70 : 0}
                minSize={isCanvasOpen && currentArtifact ? 50 : 0}
                className={`md:min-w-[400px] flex flex-col ${!isCanvasOpen || !currentArtifact ? 'hidden' : ''}`}
              >
                {currentArtifact && (
                  <Artifact
                    artifact={currentArtifact}
                    onClose={handleCloseCanvas}
                    onEdit={handleEditArtifact}
                    onBundleReactFallback={handleBundleReactFallback}
                    onContentChange={(newContent) => {
                      setCurrentArtifact({ ...currentArtifact, content: newContent });
                    }}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </>
  );
}
