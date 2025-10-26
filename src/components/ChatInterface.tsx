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
} from "@/components/prompt-kit/chat-container";
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
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import { useChatMessages, ChatMessage, type StreamProgress } from "@/hooks/useChatMessages";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Artifact, ArtifactData } from "@/components/Artifact";
import { parseArtifacts } from "@/utils/artifactParser";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { InlineImage } from "@/components/InlineImage";

interface ChatInterfaceProps {
  sessionId?: string;
  initialPrompt?: string;
  isCanvasOpen?: boolean;
  onCanvasToggle?: (isOpen: boolean) => void;
  onArtifactChange?: (hasContent: boolean) => void;
}

export function ChatInterface({ sessionId, initialPrompt, isCanvasOpen = false, onCanvasToggle, onArtifactChange }: ChatInterfaceProps) {
  const { messages, isLoading, streamChat } = useChatMessages(sessionId);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState<StreamProgress>({
    stage: "analyzing",
    message: "Analyzing request...",
    artifactDetected: false,
    percentage: 0
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (initialPrompt && sessionId && !hasInitialized) {
      setHasInitialized(true);
      handleSend(initialPrompt);
    }
  }, [sessionId, initialPrompt, hasInitialized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Parse artifacts from messages
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
        const newArtifact = artifacts[artifacts.length - 1];
        
        // Skip canvas system entirely for image artifacts
        if (newArtifact.type === 'image') {
          setCurrentArtifact(null);
          onArtifactChange?.(false);
        } else {
          // Only set artifact and open canvas for non-image types
          setCurrentArtifact(newArtifact);
          onArtifactChange?.(true);
          // Auto-open canvas when new artifact is detected
          if (onCanvasToggle && !isCanvasOpen) {
            onCanvasToggle(true);
          }
        }
      } else {
        setCurrentArtifact(null);
        onArtifactChange?.(false);
      }
    } else {
      setCurrentArtifact(null);
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      // Add file reference to input
      setInput(prev => `${prev}\n[${file.name}](${publicUrl})`);
      
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
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
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={isCanvasOpen && currentArtifact ? 50 : 100} minSize={30}>
          <div className="flex h-full flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto">
              <ChatContainerRoot className="h-full">
                <ChatContainerContent className="space-y-0 px-5 py-12">
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
                            <MessageContent
                              className="prose flex-1 rounded-lg bg-transparent p-0 text-foreground"
                              markdown
                            >
                              {cleanContent}
                            </MessageContent>
                            
                            {/* Render inline images */}
                            {imageArtifacts.map(artifact => (
                              <InlineImage
                                key={artifact.id}
                                artifact={artifact}
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
                            <MessageContent className="max-w-[85%] rounded-3xl bg-muted px-5 py-2.5 text-foreground sm:max-w-[75%]">
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
                  <div ref={messagesEndRef} />
                </ChatContainerContent>
                <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
                  <ScrollButton className="shadow-sm" onClick={scrollToBottom} />
                </div>
              </ChatContainerRoot>
            </div>

            {/* Input Area */}
            <div className="z-10 shrink-0 bg-background px-3 pb-3 md:px-5 md:pb-5 safe-mobile-input">
              <div className="mx-auto max-w-3xl">
                {isEditingArtifact && currentArtifact && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                    <Pencil className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      Editing: <span className="font-medium text-foreground">{currentArtifact.title}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingArtifact(false)}
                      className="ml-auto h-6 px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <PromptInput
                  isLoading={isLoading || isStreaming}
                  value={input}
                  onValueChange={setInput}
                  onSubmit={() => handleSend()}
                  className="relative z-10 w-full rounded-3xl border border-input bg-popover p-0 pt-1 shadow-xs"
                >
                  <div className="flex flex-col">
                    <PromptInputTextarea
                      placeholder="Ask anything"
                      className="min-h-[44px] pl-4 pt-3 text-base leading-[1.3] sm:text-base md:text-base"
                    />

                    <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                      {/* Left side actions */}
                      <div className="flex items-center gap-2">
                        {/* Upload File Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 rounded-full"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingFile}
                            >
                              {isUploadingFile ? (
                                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Plus size={18} />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upload file</TooltipContent>
                        </Tooltip>
                        
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.svg,.csv,.json,.xlsx,.js,.ts,.tsx,.jsx,.py,.html,.css,.mp3,.wav,.m4a,.ogg"
                        />

                        {/* Generate Image Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 rounded-full"
                              onClick={() => setInput("Generate an image of ")}
                            >
                              <ImageIcon size={18} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate Image</TooltipContent>
                        </Tooltip>

                        {/* Create/Canvas Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "size-9 rounded-full",
                                isCanvasOpen && currentArtifact && "bg-accent"
                              )}
                              onClick={handleCreateClick}
                            >
                              <WandSparkles size={18} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {!currentArtifact 
                              ? "Create" 
                              : isCanvasOpen 
                                ? "Close Canvas" 
                                : "Open Canvas"}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Right side - Send button */}
                      <Button
                        size="icon"
                        disabled={!input.trim() || isLoading || isStreaming}
                        onClick={() => handleSend()}
                        className="size-9 rounded-full"
                      >
                        {!(isLoading || isStreaming) ? (
                          <ArrowUp size={18} />
                        ) : (
                          <span className="size-3 rounded-xs bg-white" />
                        )}
                      </Button>
                    </PromptInputActions>
                  </div>
                </PromptInput>
              </div>
            </div>
          </div>
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

