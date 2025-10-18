import { useState, useRef, useEffect } from "react";
import { Send, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Chat..."
              className="min-h-[60px] resize-none pr-12"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 bg-gradient-primary hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Press Enter to send, Shift + Enter for new line
          </p>
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
        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 animate-fade-in",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className={cn("flex flex-col gap-1", isUser && "items-end")}>
        {isUser ? (
          <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
            {message.content}
          </MessageContent>
        ) : (
          <div className="text-foreground prose w-full rounded-lg bg-transparent p-0">
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
