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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  sessionId?: string;
  initialPrompt?: string;
}

export function ChatInterface({ sessionId, initialPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      handleSend();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you're asking about: "${userMessage.content}". This is a demo response. Connect Lovable Cloud to enable real AI responses!`,
        reasoning: `Analysis: The user's question touches on several key concepts. I'm breaking down the response into clear, actionable steps based on the context provided.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };


  return (
    <div className="flex h-full flex-col">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="space-y-0 px-5 py-12">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <MessageComponent className="justify-start">
              <MessageAvatar fallback="AI" />
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
              </div>
            </MessageComponent>
          )}
        </ChatContainerContent>
      </ChatContainerRoot>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <div className="mx-auto max-w-4xl">
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isLoading}
            onSubmit={handleSend}
            className="w-full"
          >
            <PromptInputTextarea placeholder="Message AI Chat..." />
            <PromptInputActions className="justify-end pt-2">
              <PromptInputAction
                tooltip={isLoading ? "Stop generation" : "Send message"}
              >
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleSend}
                >
                  {isLoading ? (
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

function MessageBubble({ message }: { message: Message }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = message.role === "user";

  return (
    <MessageComponent
      className={cn(
        "mx-auto w-full max-w-3xl px-6 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && <MessageAvatar fallback="AI" />}
      
      <div className={cn("flex max-w-[85%] flex-1 flex-col gap-2 sm:max-w-[75%]", isUser && "items-end")}>
        {isUser ? (
          <MessageContent className="bg-primary text-primary-foreground">
            {message.content}
          </MessageContent>
        ) : (
          <div className="bg-secondary text-foreground prose rounded-lg p-3">
            <Markdown>{message.content}</Markdown>
          </div>
        )}

        {!isUser && message.reasoning && (
          <div className="w-full">
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

      {isUser && <MessageAvatar fallback="U" className="order-last" />}
    </MessageComponent>
  );
}
