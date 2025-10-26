import { useState, useRef, useEffect } from "react";
import { ArrowUp, Copy, Pencil, Trash, ThumbsUp, ThumbsDown, Wrench, PanelRight, ImageIcon } from "lucide-react";
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

  const handleCanvasToolClick = () => {
    if (!currentArtifact) {
      // No artifact exists - send a message asking what to build
      setStreamingMessage("What would you like me to build today?");
      setTimeout(() => {
        setStreamingMessage("");
      }, 3000);
    } else {
      // Artifact exists - toggle canvas open/close
      onCanvasToggle?.(!isCanvasOpen);
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

                    <PromptInputActions className="mt-5 flex w-full items-center justify-end gap-2 px-3 pb-3">
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "size-9 rounded-full",
                                  isCanvasOpen && currentArtifact && "bg-accent"
                                )}
                              >
                                <Wrench size={18} />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Tools</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                          <DropdownMenuItem onClick={() => setInput("Generate an image of ")}>
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Generate Image
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleCanvasToolClick}>
                            <PanelRight className="h-4 w-4 mr-2" />
                            {!currentArtifact ? "Canvas" : isCanvasOpen ? "Close Canvas" : "Open Canvas"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
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

