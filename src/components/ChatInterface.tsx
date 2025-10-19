import { useState, useRef, useEffect } from "react";
import { ArrowUp, Copy, Pencil, Trash, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { useChatMessages, ChatMessage } from "@/hooks/useChatMessages";

interface ChatInterfaceProps {
  sessionId?: string;
  initialPrompt?: string;
}

export function ChatInterface({ sessionId, initialPrompt }: ChatInterfaceProps) {
  const { messages, isLoading, streamChat } = useChatMessages(sessionId);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset when session changes
  useEffect(() => {
    setStreamingMessage("");
    setIsStreaming(false);
    setHasInitialized(false);
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

  const handleSend = async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() || isLoading || isStreaming) return;

    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");

    await streamChat(
      messageToSend,
      (chunk) => {
        setStreamingMessage((prev) => prev + chunk);
      },
      () => {
        setStreamingMessage("");
        setIsStreaming(false);
      }
    );
  };
  return (
    <div className="flex h-full flex-col">
      <div ref={messagesEndRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLastMessage = index === messages.length - 1;

              return (
                <MessageComponent
                  key={message.id}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end"
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      <MessageContent
                        className="prose flex-1 rounded-lg bg-transparent p-0 text-foreground"
                        markdown
                      >
                        {message.content}
                      </MessageContent>
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
            })}
            
            {isStreaming && streamingMessage && (
              <MessageComponent className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                <div className="group flex w-full flex-col gap-0">
                  <MessageContent className="prose flex-1 rounded-lg bg-transparent p-0 text-foreground" markdown>
                    {streamingMessage}
                  </MessageContent>
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
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" onClick={scrollToBottom} />
          </div>
        </ChatContainerRoot>
      </div>

      {/* Input Area */}
      <div className="z-10 shrink-0 bg-background px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
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
  );
}

