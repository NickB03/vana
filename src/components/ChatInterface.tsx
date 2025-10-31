import { useState, useRef, useEffect } from "react";
import { ArrowUp, Copy, Pencil, Trash, ThumbsUp, ThumbsDown, Plus, ImageIcon, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Markdown } from "@/components/ui/markdown";
import { useChatMessages, ChatMessage, type StreamProgress } from "@/hooks/useChatMessages";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Artifact, ArtifactData } from "@/components/Artifact";
import { ArtifactCard } from "@/components/ArtifactCard";
import { parseArtifacts } from "@/utils/artifactParser";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { InlineImage } from "@/components/InlineImage";

interface ChatInterfaceProps {
  sessionId?: string;
  initialPrompt?: string;
  isCanvasOpen?: boolean;
  onCanvasToggle?: (isOpen: boolean) => void;
  onArtifactChange?: (hasContent: boolean) => void;
  input?: string;
  onInputChange?: (value: string) => void;
  onSendMessage?: (handleSend: (message?: string) => Promise<void>) => void;
}

export function ChatInterface({ 
  sessionId, 
  initialPrompt, 
  isCanvasOpen = false, 
  onCanvasToggle, 
  onArtifactChange,
  input: parentInput,
  onInputChange: parentOnInputChange,
  onSendMessage
}: ChatInterfaceProps) {
  const { messages, isLoading, streamChat } = useChatMessages(sessionId);
  const [localInput, setLocalInput] = useState("");
  const input = parentInput ?? localInput;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when session changes
  useEffect(() => {
    setStreamingMessage("");
    setIsStreaming(false);
    setHasInitialized(false);
    setCurrentArtifact(null);
    setIsEditingArtifact(false);
    onArtifactChange?.(false);
  }, [sessionId]);

  // Expose handleSend to parent component
  useEffect(() => {
    if (onSendMessage) {
      onSendMessage(handleSend);
    }
  }, [onSendMessage]);

  useEffect(() => {
    if (initialPrompt && sessionId && !hasInitialized) {
      setHasInitialized(true);
      handleSend(initialPrompt);
    }
  }, [sessionId, initialPrompt, hasInitialized]);

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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload files");
        return;
      }

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

  const handleSend = async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() || isLoading || isStreaming) return;

    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");

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
      currentArtifact && isEditingArtifact ? currentArtifact : undefined
    );
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

  return (
    <div className="flex h-full flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={isCanvasOpen && currentArtifact ? 50 : 100} minSize={30}>
          <ChatContainerRoot className="relative flex h-full flex-col">
            <ChatContainerContent className="flex-1 space-y-0 px-5 py-12">
                {messages.map((message, index) => {
                  const { artifacts, cleanContent } = parseArtifacts(message.content);
                  const isAssistant = message.role === "assistant";
                  const isLastMessage = index === messages.length - 1;

                  // Separate image artifacts from other artifacts
                  const imageArtifacts = artifacts.filter(a => a.type === 'image');
                  const otherArtifacts = artifacts.filter(a => a.type !== 'image');

                  return (
                    <MessageComponent
                      key={message.id}
                      className={cn(
                        "chat-message mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                        isAssistant ? "items-start" : "items-end"
                      )}
                    >
                      {isAssistant ? (
                        <div className="group flex w-full flex-col gap-0">
                          {message.reasoning && (
                            <ThinkingIndicator status={message.reasoning} />
                          )}
                          <MessageContent className="prose flex-1 rounded-lg bg-transparent p-0 text-foreground">
                            <Markdown id={message.id}>{cleanContent}</Markdown>
                          </MessageContent>

                          {/* Render inline images */}
                          {imageArtifacts.map(artifact => (
                            <InlineImage
                              key={artifact.id}
                              artifact={artifact}
                            />
                          ))}

                          {/* Render artifact cards for non-image artifacts */}
                          {otherArtifacts.map(artifact => (
                            <ArtifactCard
                              key={artifact.id}
                              artifact={artifact}
                              onOpen={() => {
                                setCurrentArtifact(artifact);
                                if (onCanvasToggle) {
                                  onCanvasToggle(true);
                                }
                              }}
                              className="mt-2"
                            />
                          ))}

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
                          <MessageContent className="w-auto max-w-2xl rounded-3xl bg-muted px-5 py-2.5 text-foreground">
                            {cleanContent}
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
                })}

                {isStreaming && streamingMessage && (
                  <MessageComponent className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                    <div className="group flex w-full flex-col gap-0">
                      <ThinkingIndicator
                        status={streamProgress.message}
                        isStreaming
                        percentage={streamProgress.percentage}
                      />
                    </div>
                  </MessageComponent>
                )}

                {(isLoading || isStreaming) && !streamingMessage && (
                  <MessageComponent className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                    </div>
                  </MessageComponent>
                )}
              </ChatContainerContent>

            <div className="absolute bottom-4 right-4">
              <ScrollButton className="shadow-sm" />
            </div>
          </ChatContainerRoot>
        </ResizablePanel>

        {isCanvasOpen && currentArtifact && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <Artifact 
                artifact={currentArtifact} 
                onClose={handleCloseCanvas}
                onEdit={handleEditArtifact}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

