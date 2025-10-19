import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, LogOut, Settings, Check, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { sessions, isLoading: sessionsLoading, createSession, deleteSession } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Skip auth in dev mode
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      setIsAuthenticated(true);
      return;
    }

    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setInput("");
    setShowChat(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    setInput(""); // Clear input when switching sessions
    setCurrentSessionId(sessionId);
    setShowChat(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSubmit = async () => {
    if (!input.trim() || !isAuthenticated) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication required",
          description: "Please log in to start chatting",
          variant: "destructive",
        });
        navigate("/auth");
      }
      return;
    }
    
    setIsLoading(true);
    const sessionId = await createSession(input);
    if (sessionId) {
      setCurrentSessionId(sessionId);
      setShowChat(true);
    }
    setIsLoading(false);
  };

  const handleValueChange = (value: string) => {
    setInput(value);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        onDeleteSession={deleteSession}
        isLoading={sessionsLoading}
      />
      <SidebarInset>
        <main className="flex h-screen flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme("charcoal")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "charcoal" ? "opacity-100" : "opacity-0"}`} />
                        <span>Charcoal Blue</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
                        <span>Midnight</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "light" ? "opacity-100" : "opacity-0"}`} />
                        <span>Warm Clay</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("ocean")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "ocean" ? "opacity-100" : "opacity-0"}`} />
                        <span>Ocean Breeze</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("sunset")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "sunset" ? "opacity-100" : "opacity-0"}`} />
                        <span>Sunset Glow</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("forest")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "forest" ? "opacity-100" : "opacity-0"}`} />
                        <span>Forest Sage</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("gemini")}>
                        <Check className={`mr-2 h-4 w-4 ${theme === "gemini" ? "opacity-100" : "opacity-0"}`} />
                        <span>Sky Blue</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {!showChat ? (
              <div className="flex h-full flex-col items-center justify-center p-8">
                <div className="mb-8 text-center">
                  <h1 className="mb-4 bg-gradient-primary bg-clip-text text-5xl font-bold text-transparent">
                    How can I help you?
                  </h1>
                </div>
                
                <PromptInput
                  value={input}
                  onValueChange={handleValueChange}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                  className="w-full max-w-3xl"
                >
                  <PromptInputTextarea placeholder="Ask me anything..." />
                  <PromptInputActions className="justify-end pt-2">
                    <PromptInputAction
                      tooltip={isLoading ? "Stop generation" : "Send message"}
                    >
                      <Button
                        variant="default"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={handleSubmit}
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
            ) : (
              <ChatInterface
                sessionId={currentSessionId}
                initialPrompt={input}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Index;
