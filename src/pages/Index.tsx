import { useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { PromptSuggestions } from "@/components/PromptSuggestions";
import { ChatInterface } from "@/components/ChatInterface";
import { ThemeProvider } from "@/components/ThemeProvider";

const Index = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>();
  const [showChat, setShowChat] = useState(false);

  const handleSuggestionClick = (prompt: string) => {
    setSelectedPrompt(prompt);
  };

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setSelectedPrompt(undefined);
    setShowChat(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowChat(true);
    setSelectedPrompt(undefined);
  };

  // Start chat when user has a prompt ready
  const startChat = () => {
    if (selectedPrompt) {
      setShowChat(true);
      setCurrentSessionId(Date.now().toString());
    }
  };

  return (
    <ThemeProvider defaultTheme="system">
      <SidebarProvider defaultOpen={true}>
        <ChatSidebar
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
        />
        <SidebarInset>
          <main className="flex h-screen flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-semibold">
                {showChat ? "Chat Session" : "New Chat"}
              </h1>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              {!showChat && !selectedPrompt ? (
                <div className="flex h-full items-center justify-center overflow-y-auto">
                  <PromptSuggestions onSuggestionClick={handleSuggestionClick} />
                </div>
              ) : !showChat && selectedPrompt ? (
                <div className="flex h-full items-center justify-center overflow-y-auto p-8">
                  <div className="w-full max-w-4xl">
                    <div className="mb-4 rounded-lg border-2 border-primary bg-gradient-subtle p-6">
                      <p className="text-lg">{selectedPrompt}</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={startChat}
                        className="flex-1 rounded-lg bg-gradient-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Start Chat
                      </button>
                      <button
                        onClick={() => setSelectedPrompt(undefined)}
                        className="rounded-lg border-2 border-border px-6 py-3 font-semibold transition-colors hover:bg-muted"
                      >
                        Choose Different
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <ChatInterface
                  sessionId={currentSessionId}
                  initialPrompt={selectedPrompt}
                />
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Index;
