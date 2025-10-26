import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, LogOut, Settings, Check, ChevronRight, Palette } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { ensureValidSession } from "@/utils/authHelpers";

const IndexContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { themeMode, colorTheme, setThemeMode, setColorTheme } = useTheme();
  const { sessions, isLoading: sessionsLoading, createSession, deleteSession } = useChatSessions();
  const { setOpen } = useSidebar();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Check authentication with session validation
    const checkAuth = async () => {
      const session = await ensureValidSession();
      setIsAuthenticated(!!session);
      if (!session) {
        navigate("/auth");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session && event !== 'INITIAL_SESSION') {
        navigate("/auth");
      }
    });

    // Optimized session validation - check only when necessary
    // Check 5 minutes before token expiry instead of polling every 5 minutes
    let timeoutId: NodeJS.Timeout;
    
    const scheduleSessionCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000; // Convert to ms
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const checkTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000); // Check 5 min before expiry
        
        timeoutId = setTimeout(async () => {
          const validSession = await ensureValidSession();
          if (!validSession) {
            setIsAuthenticated(false);
            toast({
              title: "Session Expired",
              description: "Please sign in again to continue",
              variant: "destructive",
            });
            navigate("/auth");
          } else {
            scheduleSessionCheck(); // Schedule next check
          }
        }, checkTime);
      }
    };
    
    scheduleSessionCheck();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, toast]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (showChat) {
        setShowChat(false);
        setCurrentSessionId(undefined);
        setInput("");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showChat]);

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setInput("");
    setShowChat(false);
    setIsCanvasOpen(false);
    setHasArtifact(false);
    // Reset browser history to home state
    window.history.pushState(null, "", "/");
  };

  const handleCanvasToggle = () => {
    if (hasArtifact) {
      setIsCanvasOpen(!isCanvasOpen);
    }
  };

  const handleArtifactChange = (hasContent: boolean) => {
    setHasArtifact(hasContent);
    if (!hasContent) {
      setIsCanvasOpen(false);
    } else {
      // Auto-collapse sidebar when artifact appears
      setIsCanvasOpen(true);
      setOpen(false);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setInput(""); // Clear input when switching sessions
    setCurrentSessionId(sessionId);
    setShowChat(true);
    // Push state for browser back button
    window.history.pushState({ showChat: true }, "", "/");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Validate session before creating chat
    const session = await ensureValidSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please refresh the page or sign in again",
        variant: "destructive",
      });
      setIsAuthenticated(false);
      navigate("/auth");
      return;
    }
    
    setIsLoading(true);
    const sessionId = await createSession(input);
    if (sessionId) {
      setCurrentSessionId(sessionId);
      setShowChat(true);
      // Push state for browser back button
      window.history.pushState({ showChat: true }, "", "/");
    }
    setIsLoading(false);
  };

  const handleValueChange = (value: string) => {
    setInput(value);
  };

  return (
    <>
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
          <header className="bg-background sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-background px-4" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="min-h-[44px] min-w-[44px]" />
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
                  
                  <div className="px-2 py-2">
                    <div className="text-xs font-medium mb-2 text-muted-foreground">Theme Mode</div>
                    <ThemeSwitcher 
                      value={themeMode}
                      onChange={setThemeMode}
                    />
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette className="mr-2 h-4 w-4" />
                      <span>Color Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setColorTheme("default")}>
                        <Check className={`mr-2 h-4 w-4 ${colorTheme === "default" ? "opacity-100" : "opacity-0"}`} />
                        <span>Default</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setColorTheme("charcoal")}>
                        <Check className={`mr-2 h-4 w-4 ${colorTheme === "charcoal" ? "opacity-100" : "opacity-0"}`} />
                        <span>Charcoal</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setColorTheme("gemini")}>
                        <Check className={`mr-2 h-4 w-4 ${colorTheme === "gemini" ? "opacity-100" : "opacity-0"}`} />
                        <span>Sky Blue</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setColorTheme("ocean")}>
                        <Check className={`mr-2 h-4 w-4 ${colorTheme === "ocean" ? "opacity-100" : "opacity-0"}`} />
                        <span>Ocean Breeze</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setColorTheme("sunset")}>
                        <Check className={`mr-2 h-4 w-4 ${colorTheme === "sunset" ? "opacity-100" : "opacity-0"}`} />
                        <span>Sunset Glow</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setColorTheme("forest")}>
                        <Check className={`mr-2 h-4 w-4 ${colorTheme === "forest" ? "opacity-100" : "opacity-0"}`} />
                        <span>Forest Sage</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  {isAuthenticated ? (
                    <DropdownMenuItem onClick={handleLogout}>
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate("/auth")}>
                      <span>Sign In</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {!showChat ? (
              <div className="flex h-full flex-col items-center justify-between sm:justify-center p-4 sm:p-8 pt-safe">
                {/* Heading Zone - positioned in upper portion on mobile */}
                <div className="flex-1 flex items-center justify-center sm:flex-initial">
                  <div className="text-center">
                    <h1 className="bg-gradient-primary bg-clip-text text-3xl sm:text-4xl md:text-5xl font-bold text-transparent">
                      How can I help you?
                    </h1>
                  </div>
                </div>
                
                {/* Input Zone - anchored to bottom on mobile */}
                <div className="w-full max-w-3xl pb-safe">
                  <PromptInput
                    value={input}
                    onValueChange={handleValueChange}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                    className="w-full safe-mobile-input"
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
              </div>
            ) : (
              <ChatInterface
                sessionId={currentSessionId}
                initialPrompt={input}
                isCanvasOpen={isCanvasOpen}
                onCanvasToggle={setIsCanvasOpen}
                onArtifactChange={handleArtifactChange}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </>
  );
};

const Index = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <IndexContent />
    </SidebarProvider>
  );
};

export default Index;
