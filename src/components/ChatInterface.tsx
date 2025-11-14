import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Pencil, Trash, ThumbsUp, ThumbsDown, Maximize2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define handleSend early using useCallback to avoid initialization errors
  const handleSend = useCallback(async (message?: string) => {
    const messageToSend = message || input;

    if (typeof messageToSend !== 'string' || !messageToSend.trim() || isLoading || isStreaming) {
      return;
    }

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
  }, [input, isLoading, isStreaming, sessionId, setInput, streamChat, currentArtifact, isEditingArtifact, imageMode, artifactMode]);

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
      allMessages.push({ role: "assistant", content: streamingMessage } as any);
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
  }, [messages, streamingMessage]);

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

  // Render chat content (messages + input) - reusable for both mobile and desktop
  const renderChatContent = () => (
    <div className="flex h-full flex-col">
            <ChatContainerRoot className="relative flex flex-1 flex-col min-h-0">
              <ChatContainerContent className={combineSpacing("flex-1 space-y-0", CHAT_SPACING.messageList)}>
                {/* Guest mode system message - show after first message */}
                {isGuest && messages.length > 0 && (
                  <div className="mx-auto w-full max-w-3xl px-6 py-3">
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
                        "chat-message mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
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
                            onArtifactOpen={(artifact) => {
                              setCurrentArtifact(artifact);
                              if (onCanvasToggle) {
                                onCanvasToggle(true);
                              }
                            }}
                          />

                          <MessageActions
                            className={cn(
                              "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                              isLastMessage && "opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Copy" delayDuration={100}>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <Copy />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Upvote" delayDuration={100}>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <ThumbsUp />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Downvote" delayDuration={100}>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <ThumbsDown />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      ) : (
                        <div className="group flex flex-col items-end gap-1">
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
                              "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Edit" delayDuration={100}>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <Pencil />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Delete" delayDuration={100}>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <Trash />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Copy" delayDuration={100}>
                              <Button variant="ghost" size="icon" className="rounded-full">
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
                  <MessageComponent className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
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
                        onArtifactOpen={(artifact) => {
                          setCurrentArtifact(artifact);
                          if (onCanvasToggle) {
                            onCanvasToggle(true);
                          }
                        }}
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
            </ChatContainerRoot>

            {/* Prompt Input - stays in left panel */}
            <div className={combineSpacing("shrink-0 bg-transparent safe-mobile-input", CHAT_SPACING.input.container, SAFE_AREA_SPACING.bottom)}>
              <div className="mx-auto max-w-3xl">
                <PromptInput
                  value={input}
                  onValueChange={setInput}
                  isLoading={isLoading || isStreaming}
                  onSubmit={handleSend}
                  className="w-full relative rounded-3xl border border-input bg-popover p-0 pt-1 shadow-xs"
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
                      showFileUpload={true}
                      fileInputRef={fileInputRef}
                      isUploadingFile={isUploadingFile}
                      onFileUpload={handleFileUpload}
                      sendIcon="arrow"
                    />
                  </div>
                </PromptInput>
              </div>
            </div>
          </div>
  );

  return (
    <div className="flex h-full flex-col">
      {isMobile ? (
        // Mobile Layout: Fullscreen artifact overlay or chat
        <div className="relative h-full">
          {isCanvasOpen && currentArtifact ? (
            // Mobile: Fullscreen artifact
            <div className="fixed inset-0 z-50 bg-background">
              <Artifact
                artifact={currentArtifact}
                onClose={handleCloseCanvas}
                onEdit={handleEditArtifact}
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
        // Desktop Layout: Side-by-side resizable panels (unchanged)
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={isCanvasOpen && currentArtifact ? 40 : 100} minSize={25} className="md:min-w-[300px]">
            {renderChatContent()}
          </ResizablePanel>

          {isCanvasOpen && currentArtifact && (
            <>
              <ResizableHandle withHandle className="hidden md:flex" />
              <ResizablePanel defaultSize={60} minSize={40} className="md:min-w-[400px]">
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

