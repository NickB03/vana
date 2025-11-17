import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Pencil, Trash, ThumbsUp, ThumbsDown, Maximize2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArtifactContainer as Artifact, ArtifactData } from "@/components/ArtifactContainer";
import { MessageWithArtifacts } from "@/components/MessageWithArtifacts";
import { parseArtifacts } from "@/utils/artifactParser";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { ReasoningIndicator } from "@/components/ReasoningIndicator";
import { ReasoningErrorBoundary } from "@/components/ReasoningErrorBoundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { SystemMessage } from "@/components/ui/system-message";
import { useNavigate } from "react-router-dom";

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
  isGuest?: boolean;
  guestMessageCount?: number;
  guestMaxMessages?: number;
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
  isGuest = false,
  guestMessageCount = 0,
  guestMaxMessages = 10
}: ChatInterfaceProps) {
  const isMobile = useIsMobile();
  const { trigger: haptic } = useHapticFeedback();
  const navigate = useNavigate();
  const { messages, isLoading, streamChat } = useChatMessages(sessionId);
  const [localInput, setLocalInput] = useState("");
  const input = typeof parentInput === 'string' ? parentInput : localInput;
  const setInput = parentOnInputChange ?? setLocalInput;
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState<StreamProgress>({
    stage: "analyzing",
    message: "Analyzing request...",
    artifactDetected: false,
    percentage: 0
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);
  const [isEditingArtifact, setIsEditingArtifact] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [imageMode, setImageMode] = useState(initialImageMode);
  const [artifactMode, setArtifactMode] = useState(initialArtifactMode);
  const [tappedMessageId, setTappedMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized artifact open handler to prevent breaking MessageWithArtifacts memo
  const handleArtifactOpen = useCallback((artifact: ArtifactData) => {
    setCurrentArtifact(artifact);
    if (onCanvasToggle) {
      onCanvasToggle(true);
    }
  }, [onCanvasToggle]);

  // Define handleSend early using useCallback to avoid initialization errors
  const handleSend = useCallback(async (message?: string) => {
    const messageToSend = message || input;

    if (typeof messageToSend !== 'string' || !messageToSend.trim() || isLoading || isStreaming) {
      return;
    }

    // Haptic feedback on message send
    haptic('medium');

    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");

    // Capture mode states and reset them after sending
    const shouldGenerateImage = imageMode;
    const shouldGenerateArtifact = artifactMode;
    console.log("🎯 [ChatInterface.handleSend] Captured modes:", {
      imageMode,
      artifactMode,
      shouldGenerateImage,
      shouldGenerateArtifact
    });
    setImageMode(false);
    setArtifactMode(false);

    await streamChat(
      messageToSend,
      (chunk, progress) => {
        setStreamingMessage((prev) => prev + chunk);
        setStreamProgress(progress);
      },
      () => {
        setStreamingMessage("");
        setIsStreaming(false);
        setIsEditingArtifact(false);
        setStreamProgress({
          stage: "complete",
          message: "",
          artifactDetected: false,
          percentage: 100
        });
      },
      currentArtifact && isEditingArtifact ? currentArtifact : undefined,
      shouldGenerateImage,
      shouldGenerateArtifact
    );
  }, [input, isLoading, isStreaming, setInput, streamChat, currentArtifact, isEditingArtifact, imageMode, artifactMode, haptic]);

  // Reset when session changes
  useEffect(() => {
    setStreamingMessage("");
    setIsStreaming(false);
    setHasInitialized(false);
    setCurrentArtifact(null);
    setIsEditingArtifact(false);
    onArtifactChange?.(false);
  }, [sessionId, onArtifactChange]);

  // Expose handleSend to parent component
  useEffect(() => {
    if (onSendMessage) {
      onSendMessage(handleSend);
    }
  }, [onSendMessage, handleSend]);

  useEffect(() => {
    // Allow auto-send for both authenticated (with sessionId) AND guests (without sessionId)
    if (initialPrompt && !hasInitialized) {
      setHasInitialized(true);
      handleSend(initialPrompt);
    }
  }, [sessionId, initialPrompt, hasInitialized, handleSend]);

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
      const { artifacts } = parseArtifacts(lastAssistantMsg.content);
      if (artifacts.length > 0) {
        // Set artifact but don't auto-open canvas
        // User will click "Open" button on artifact card to open
        onArtifactChange?.(true);
      } else {
        onArtifactChange?.(false);
      }
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
        toast.error(validationResult.error || "File validation failed");
        return;
      }

      const session = await ensureValidSession();
      if (!session) {
        toast.error("Authentication required. Please refresh the page or sign in again.");
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
      setInput(prev => `${prev}\n[${file.name}](${signedUrlData.signedUrl})`);
      
      toast.success("File uploaded successfully");
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
        toast.error(`Upload succeeded but URL generation failed: ${errorMessage}`);
      } else if (errorMessage.includes('File too large')) {
        toast.error('File is too large. Maximum size is 100MB.');
      } else if (errorMessage.includes('Invalid file type')) {
        toast.error('Invalid file type. Supported types: images, documents, text files.');
      } else {
        toast.error(`Failed to upload file: ${errorMessage}`);
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

  // Message action handlers with haptic feedback
  const handleCopyMessage = useCallback((content: string) => {
    haptic('light');
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }, [haptic]);

  const handleEditMessage = useCallback(() => {
    haptic('light');
    // Edit functionality to be implemented
    toast.info("Edit feature coming soon");
  }, [haptic]);

  const handleDeleteMessage = useCallback(() => {
    haptic('warning');
    // Delete functionality to be implemented
    toast.info("Delete feature coming soon");
  }, [haptic]);

  // Render chat content (messages + input) - reusable for both mobile and desktop
  const renderChatContent = () => (
    <div className="flex flex-1 flex-col min-h-0 p-4">
      {/* Unified chat card with embedded prompt input */}
      <div className="relative mx-auto flex flex-1 min-h-0 w-full max-w-4xl rounded-3xl bg-black/50 backdrop-blur-sm shadow-lg border border-border/30">
        <ChatContainerRoot className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <ChatContainerContent
            className={combineSpacing(
              "space-y-0 w-full",
              CHAT_SPACING.messageList
            )}
          aria-label="Chat conversation"
        >
          {/* Guest mode system message - show after first message */}
          {isGuest && messages.length > 0 && (
            <div className="mx-auto w-full max-w-4xl px-6 py-3">
              <SystemMessage
                variant="action"
                fill
                cta={{
                  label: "Sign In",
                  onClick: () => navigate("/auth")
                }}
              >
                {guestMessageCount < guestMaxMessages ? (
                  <>You have <strong>{guestMaxMessages - guestMessageCount}</strong> free message{guestMaxMessages - guestMessageCount !== 1 ? 's' : ''} remaining. Sign in for increased limits on the free tier!</>
                ) : (
                  <>You've reached your free message limit. Sign in to continue chatting with increased limits!</>
                )}
              </SystemMessage>
            </div>
          )}

          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            const isLastMessage = index === messages.length - 1;

            // Only animate new messages (last message when not streaming)
            // This prevents performance issues with long chat histories
            const shouldAnimate = isLastMessage && !isStreaming;

            const messageContent = (
                    <MessageComponent
                      className={cn(
                        "chat-message mx-auto flex w-full max-w-4xl flex-col gap-2 px-2 sm:px-4",
                        isAssistant ? "items-start" : "items-end"
                      )}
                    >
                      {isAssistant ? (
                        <div className="group flex w-full flex-col gap-0">
                          {(message.reasoning || message.reasoning_steps) && (
                            <ReasoningErrorBoundary>
                              <ReasoningIndicator
                                reasoning={message.reasoning}
                                reasoningSteps={message.reasoning_steps}
                              />
                            </ReasoningErrorBoundary>
                          )}
                          <MessageWithArtifacts
                            content={message.content}
                            messageId={message.id}
                            onArtifactOpen={handleArtifactOpen}
                          />

                          <MessageActions
                            className={cn(
                              "flex gap-1 transition-opacity duration-150",
                              isMobile ? (
                                isLastMessage ? "opacity-100" : cn(
                                  "opacity-0",
                                  tappedMessageId === message.id && "opacity-100"
                                )
                              ) : (
                                cn(
                                  "-ml-2.5 gap-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                                  isLastMessage && "opacity-100"
                                )
                              )
                            )}
                          >
                            <MessageAction tooltip="Copy" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("rounded-full", isMobile && "h-9 w-9")}
                                onClick={() => handleCopyMessage(message.content)}
                              >
                                <Copy />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Upvote" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("rounded-full", isMobile && "h-9 w-9")}
                                onClick={() => haptic('light')}
                              >
                                <ThumbsUp />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Downvote" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("rounded-full", isMobile && "h-9 w-9")}
                                onClick={() => haptic('light')}
                              >
                                <ThumbsDown />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      ) : (
                        <div
                          className="group flex flex-col items-end gap-1"
                          onClick={() => {
                            if (isMobile) {
                              setTappedMessageId(message.id);
                              setTimeout(() => setTappedMessageId(null), 3000);
                            }
                          }}
                        >
                          <MessageContent
                            className="w-auto max-w-2xl rounded-3xl px-5 py-2.5 text-foreground border transition-all duration-150"
                            style={{
                              backgroundColor: 'hsl(var(--accent-user) / 0.08)',
                              borderColor: 'hsl(var(--accent-user) / 0.15)',
                            }}
                          >
                            {message.content}
                          </MessageContent>
                          <MessageActions
                            className={cn(
                              "flex transition-opacity duration-150",
                              isMobile ? (
                                cn(
                                  "gap-1 opacity-0",
                                  tappedMessageId === message.id && "opacity-100"
                                )
                              ) : (
                                "gap-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                              )
                            )}
                          >
                            <MessageAction tooltip="Edit" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("rounded-full", isMobile && "h-9 w-9")}
                                onClick={handleEditMessage}
                              >
                                <Pencil />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Delete" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("rounded-full", isMobile && "h-9 w-9")}
                                onClick={handleDeleteMessage}
                              >
                                <Trash />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Copy" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("rounded-full", isMobile && "h-9 w-9")}
                                onClick={() => handleCopyMessage(message.content)}
                              >
                                <Copy />
                              </Button>
                            </MessageAction>
                          </MessageActions>
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
                        ease: ANIMATION_EASINGS.easeOut
                      }}
                    >
                      {messageContent}
                    </motion.div>
                  ) : (
                    <div key={message.id}>{messageContent}</div>
                  );
                })}

                {isStreaming && streamingMessage && (
                  <MessageComponent className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-2 sm:px-4 items-start">
                    <div className="group flex w-full flex-col gap-0">
                      <ReasoningErrorBoundary fallback={<ThinkingIndicator status="Loading reasoning..." />}>
                        <ReasoningIndicator
                          reasoning={streamProgress.message}
                          reasoningSteps={streamProgress.reasoningSteps}
                          isStreaming
                          percentage={streamProgress.percentage}
                        />
                      </ReasoningErrorBoundary>
                      <MessageWithArtifacts
                        content={streamingMessage}
                        onArtifactOpen={handleArtifactOpen}
                      />
                    </div>
                  </MessageComponent>
                )}

            {(isLoading || isStreaming) && !streamingMessage && (
              <MessageSkeleton variant="assistant" />
            )}
        </ChatContainerContent>

        <div className="absolute bottom-4 right-4">
          <ScrollButton className="shadow-sm" />
        </div>

        {/* Prompt Input - embedded within chat card */}
        <div
          className={combineSpacing("shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/30 safe-mobile-input px-4 pb-4", SAFE_AREA_SPACING.bottom)}
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
          }}
        >
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isLoading || isStreaming}
            onSubmit={handleSend}
            className="w-full relative rounded-xl bg-black/50 backdrop-blur-sm p-0 pt-1"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Ask anything"
                autoFocus={!isMobile}
                className={combineSpacing("min-h-[52px] text-base leading-[1.3] focus:min-h-[120px] transition-[min-height]", CHAT_SPACING.input.textarea)}
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
    <div className="flex flex-1 flex-col min-h-0">
      {isMobile ? (
        // Mobile Layout: Fullscreen artifact overlay or chat
        <div className="relative flex-1 min-h-0">
          {isCanvasOpen && currentArtifact ? (
            // Mobile: Fullscreen artifact with slide-up animation
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-background flex flex-col"
            >
              {/* Mobile header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/95 backdrop-blur-sm shrink-0"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseCanvas}
                  className="h-10 w-10 rounded-full"
                  aria-label="Close artifact"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <h2 className="text-base font-semibold truncate flex-1">
                  {currentArtifact.title}
                </h2>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <Artifact
                  artifact={currentArtifact}
                  onClose={handleCloseCanvas}
                  onEdit={handleEditArtifact}
                  onContentChange={(newContent) => {
                    setCurrentArtifact({ ...currentArtifact, content: newContent });
                  }}
                />
              </div>
            </motion.div>
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
                      onClick={() => {
                        haptic('medium');
                        onCanvasToggle?.(true);
                      }}
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
        // Desktop Layout: Side-by-side resizable panels with Gemini-style sizing
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel
            defaultSize={isCanvasOpen && currentArtifact ? 30 : 100}
            minSize={20}
            maxSize={isCanvasOpen && currentArtifact ? 50 : 100}
            className="md:min-w-[280px] flex flex-col"
          >
            {renderChatContent()}
          </ResizablePanel>

          {isCanvasOpen && currentArtifact && (
            <>
              <ResizableHandle withHandle className="hidden md:flex" />
              <ResizablePanel defaultSize={70} minSize={50} className="md:min-w-[400px] flex flex-col">
                <Artifact
                  artifact={currentArtifact}
                  onClose={handleCloseCanvas}
                  onEdit={handleEditArtifact}
                  onContentChange={(newContent) => {
                    setCurrentArtifact({ ...currentArtifact, content: newContent });
                  }}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}
    </div>
  );
}

