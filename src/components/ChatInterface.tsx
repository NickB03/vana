import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container";
import { Markdown } from "@/components/prompt-kit/markdown";
import {
  Message as MessageComponent,
  MessageAvatar,
  MessageContent,
} from "@/components/prompt-kit/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
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
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="space-y-4 p-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && streamingMessage && (
            <MessageComponent className="justify-start">
              <MessageAvatar fallback="AI" />
              <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                <div className="bg-secondary text-foreground prose rounded-lg p-2">
                  <Markdown>{streamingMessage}</Markdown>
                </div>
              </div>
            </MessageComponent>
          )}
          {(isLoading || isStreaming) && !streamingMessage && (
            <MessageComponent className="justify-start">
              <MessageAvatar fallback="AI" />
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
              </div>
            </MessageComponent>
          )}
          <div ref={messagesEndRef} />
        </ChatContainerContent>
      </ChatContainerRoot>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <div className="mx-auto max-w-4xl">
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isLoading || isStreaming}
            onSubmit={() => handleSend()}
            className="w-full"
          >
            <PromptInputTextarea placeholder="Message AI Chat..." />
            <PromptInputActions className="justify-end pt-2">
              <PromptInputAction
                tooltip={(isLoading || isStreaming) ? "Stop generation" : "Send message"}
              >
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleSend()}
                  disabled={isLoading || isStreaming}
                >
                  {(isLoading || isStreaming) ? (
                    <Square className="size-5 fill-current" />
                  ) : (
                    <ArrowUp className="size-5" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = message.role === "user";

  return (
    <MessageComponent
      className={isUser ? "justify-end" : "justify-start"}
    >
      {!isUser && <MessageAvatar fallback="AI" />}
      
      <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
        {isUser ? (
          <MessageContent className="bg-primary text-primary-foreground">
            {message.content}
          </MessageContent>
        ) : (
          <div className="bg-secondary text-foreground prose rounded-lg p-2">
            <Markdown>{message.content}</Markdown>
          </div>
        )}

        {!isUser && message.reasoning && (
          <div className="mt-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showReasoning ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Hide reasoning
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Show reasoning
                </>
              )}
            </Button>
            
            {showReasoning && (
              <Card className="mt-2 border-l-2 border-primary bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground italic">
                  {message.reasoning}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>

      {isUser && <MessageAvatar fallback="U" />}
    </MessageComponent>
  );
}
