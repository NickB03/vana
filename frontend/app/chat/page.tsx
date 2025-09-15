"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { VanaWelcomeMessage } from "@/components/chat/vana-welcome-message";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useState } from "react";

export default function ChatPage() {
  const [input, setInput] = useState("");

  const suggestions = [
    "Help me research market trends",
    "Analyze this document for insights", 
    "Brainstorm creative solutions",
    "Create a learning plan"
  ];

  const handleSendMessage = () => {
    if (input.trim()) {
      // Handle message sending here
      console.log("Sending message:", input);
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex flex-col h-full">
        {/* Center Content Area */}
        <div className="flex-1 flex items-center justify-center px-4">
          <VanaWelcomeMessage 
            variant="default"
            animate={true}
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Bottom Input Area */}
        <div className="flex-shrink-0 border-t border-transparent bg-background p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion, index) => (
                <PromptSuggestion
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-sm"
                >
                  {suggestion}
                </PromptSuggestion>
              ))}
            </div>

            {/* Input Area */}
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-[60px] pr-12 resize-none rounded-lg border-border focus:border-primary/50"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                size="icon"
                className="absolute bottom-2 right-2 h-8 w-8 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>

            {/* Helper Text */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send, 
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Shift + Enter</kbd> for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}