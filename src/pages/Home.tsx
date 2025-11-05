import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useScrollTransition } from "@/hooks/useScrollTransition";
import { useGuestSession } from "@/hooks/useGuestSession";
import { landingTransition, landingTransitionReduced } from "@/utils/animationConstants";
import { GradientBackground } from "@/components/ui/bg-gredient";
import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { GuestLimitBanner } from "@/components/GuestLimitBanner";
import { GuestLimitDialog } from "@/components/GuestLimitDialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { SidebarInset } from "@/components/ui/sidebar";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { ensureValidSession } from "@/utils/authHelpers";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useTheme } from "@/components/ThemeProvider";
import { Check, Palette } from "lucide-react";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/prompt-kit/prompt-input";
import { Plus, WandSparkles, Send, ImagePlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import GalleryHoverCarousel from "@/components/ui/gallery-hover-carousel";

/**
 * Home Page - Unified landing and app experience
 *
 * Features:
 * - Landing page content on initial load
 * - Scroll-triggered transition to app interface
 * - Guest mode with 5 message limit
 * - Smooth animations with reduced-motion support
 */
const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { themeMode, colorTheme, setThemeMode, setColorTheme } = useTheme();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Chat state
  const { sessions, isLoading: sessionsLoading, createSession, deleteSession } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [guestInitialPrompt, setGuestInitialPrompt] = useState<string | undefined>();
  const chatSendHandlerRef = useRef<((message?: string) => Promise<void>) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll transition
  const benefitsSectionRef = useRef<HTMLDivElement>(null);
  const { phase, progress, setTriggerElement } = useScrollTransition(true);

  // Guest session
  const guestSession = useGuestSession(isAuthenticated);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Detect reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitions = prefersReducedMotion ? landingTransitionReduced : landingTransition;

  // Set trigger element for scroll detection
  useEffect(() => {
    if (benefitsSectionRef.current) {
      setTriggerElement(benefitsSectionRef.current);
    }
  }, [setTriggerElement]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const session = await ensureValidSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show limit dialog when guest reaches limit
  useEffect(() => {
    if (guestSession.hasReachedLimit && !isAuthenticated) {
      setShowLimitDialog(true);
    }
  }, [guestSession.hasReachedLimit, isAuthenticated]);

  /**
   * Creates a new chat session and resets UI state
   */
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined);
    setInput("");
    setShowChat(false);
    setIsCanvasOpen(false);
    setHasArtifact(false);
  }, []);

  /**
   * Selects an existing chat session from sidebar
   */
  const handleSessionSelect = useCallback((sessionId: string) => {
    setInput("");
    setCurrentSessionId(sessionId);
    setShowChat(true);
  }, []);

  /**
   * Signs out user and redirects to auth page
   */
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  }, [navigate]);

  /**
   * Handles message submission from home input or chat interface
   * Race condition fix: Uses chatSendHandlerRef for synchronous access
   */
  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;

    // Check guest limit
    if (!isAuthenticated && !guestSession.canSendMessage) {
      setShowLimitDialog(true);
      return;
    }

    if (showChat && chatSendHandlerRef.current) {
      // In chat mode - call the ChatInterface's send handler via ref
      await chatSendHandlerRef.current(input);
      setInput("");

      // Increment guest message count
      if (!isAuthenticated) {
        guestSession.incrementMessageCount();
      }
      return;
    }

    // Homepage mode - create new session
    if (!isAuthenticated) {
      // For guests, just show chat without creating session
      setGuestInitialPrompt(input);  // Store the message to send
      setInput("");  // Clear input
      setShowChat(true);
      guestSession.incrementMessageCount();
    } else {
      // For authenticated users, create session
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
      }
      setIsLoading(false);
    }
  }, [input, isAuthenticated, guestSession, showChat, toast, navigate, createSession]);

  /**
   * Sets input value from suggestion card click
   */
  const handleSuggestionClick = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  /**
   * Toggles artifact canvas visibility
   */
  const handleCanvasToggle = useCallback(() => {
    if (hasArtifact) {
      setIsCanvasOpen(!isCanvasOpen);
    }
  }, [hasArtifact, isCanvasOpen]);

  /**
   * Updates artifact state when content changes
   */
  const handleArtifactChange = useCallback((hasContent: boolean) => {
    setHasArtifact(hasContent);
    if (!hasContent) {
      setIsCanvasOpen(false);
    }
  }, []);

  // Determine what content to show based on transition phase
  const showLanding = phase !== "app";
  const showApp = phase !== "landing";
  const isTransitioning = phase === "transitioning";

  return (
    <>
      {/* Landing page content - renders in normal flow for scrolling */}
      {phase !== "app" && (
        <motion.div
          className="relative"
          style={{
            pointerEvents: phase === "landing" ? "auto" : "none",
          }}
          animate={
            isTransitioning
              ? transitions.landing.fadeOut.transitioning(progress)
              : phase === "landing"
              ? transitions.landing.fadeOut.initial
              : transitions.landing.fadeOut.complete
          }
          transition={{ duration: 0 }}
        >
          <GradientBackground
            gradientFrom="#000000"
            gradientTo="#1e293b"
            gradientPosition="50% 20%"
            gradientSize="150% 150%"
            gradientStop="30%"
          />
          <Hero />
          <ShowcaseSection />
          <div ref={benefitsSectionRef}>
            <BenefitsSection />
          </div>
          {/* Spacer to allow scrolling to the bottom */}
          <div className="h-[300px]" />
        </motion.div>
      )}

      {/* App interface - fixed overlay during transition, normal flow when complete */}
      {phase !== "landing" && (
        <motion.div
          className={phase === "app" ? "relative min-h-screen" : "fixed inset-0 z-50"}
          style={{
            pointerEvents: phase !== "landing" ? "auto" : "none",
          }}
          animate={
            isTransitioning
              ? transitions.app.fadeIn.transitioning(progress)
              : phase === "app"
              ? transitions.app.fadeIn.complete
              : transitions.app.fadeIn.initial
          }
          transition={{ duration: 0 }}
        >
          <SidebarProvider defaultOpen={true}>
            <ChatSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onNewChat={handleNewChat}
              onDeleteSession={deleteSession}
              isLoading={sessionsLoading}
            />

            <SidebarInset
              className="relative"
              style={{
                background: 'radial-gradient(125% 125% at 50% 10%, #000000 40%, #1e293b 100%)',
              }}
            >
            <main className="flex h-[100dvh] flex-col overflow-hidden">
              {/* Header */}
              <header className="bg-black/40 backdrop-blur-sm sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between gap-2 px-4">
                {/* Guest limit banner */}
                {!isAuthenticated && guestSession.messageCount > 0 && (
                  <div className="flex-1 max-w-md">
                    <GuestLimitBanner
                      messageCount={guestSession.messageCount}
                      maxMessages={guestSession.maxMessages}
                    />
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
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
                        <ThemeSwitcher value={themeMode} onChange={setThemeMode} />
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
              <div className="flex-1 overflow-hidden flex flex-col">
                {!showChat ? (
                  <div className="flex h-full flex-col items-center justify-between overflow-y-auto p-4 sm:p-8 pt-safe pb-safe">
                    <div></div>

                    <div className="text-center w-full">
                      <h1 className="bg-gradient-primary bg-clip-text text-3xl sm:text-4xl md:text-5xl font-bold text-transparent mb-4">
                        Hi, I'm Vana.
                      </h1>
                      <p className="text-foreground/80 text-sm sm:text-base">
                        Get started by choosing from an idea below or tell me what you want to do in chat
                      </p>
                    </div>

                    <div className="w-full">
                      <div className="w-full max-w-3xl mx-auto mb-6 px-4">
                        <PromptInput
                          value={input}
                          onValueChange={setInput}
                          isLoading={isLoading}
                          onSubmit={handleSubmit}
                          className="w-full relative rounded-3xl border border-input bg-popover p-0 pt-1 shadow-xs"
                        >
                          <div className="flex flex-col">
                            <PromptInputTextarea
                              placeholder="Ask me anything..."
                              className="min-h-[44px] pl-4 pt-3 text-base leading-[1.3]"
                            />
                            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-9 rounded-full"
                                      onClick={() => setInput("Generate an image of ")}
                                    >
                                      <ImagePlus size={18} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Generate Image</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-9 rounded-full"
                                      onClick={() => setInput("Help me create ")}
                                    >
                                      <WandSparkles size={18} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Create</TooltipContent>
                                </Tooltip>
                              </div>

                              <div className="flex items-center gap-2">
                                <PromptInputAction tooltip="Send message">
                                  <Button
                                    type="submit"
                                    size="icon"
                                    disabled={isLoading || !input.trim()}
                                    className="size-9 rounded-full bg-gradient-primary hover:opacity-90"
                                    onClick={handleSubmit}
                                  >
                                    {isLoading ? (
                                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                      <Send size={18} className="text-white" />
                                    )}
                                  </Button>
                                </PromptInputAction>
                              </div>
                            </PromptInputActions>
                          </div>
                        </PromptInput>
                      </div>

                      <div className="w-full max-w-3xl mx-auto pb-4">
                        <GalleryHoverCarousel
                          heading=""
                          className="py-0 bg-transparent"
                          onItemClick={(item) => handleSuggestionClick(item.prompt || item.summary)}
                          items={[
                            {
                              id: "img-gen-1",
                              title: "Generate an Image",
                              summary: "Generate an image of Pikachu in a banana costume",
                              prompt: "Generate an image of Pikachu in a banana costume",
                              image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop"
                            },
                            {
                              id: "web-app-1",
                              title: "Todo List App",
                              summary: "Create an interactive todo list with categories, priorities, and deadlines",
                              prompt: "Create an interactive todo list with categories, priorities, and deadlines",
                              image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop"
                            },
                            {
                              id: "data-viz-1",
                              title: "Sales Dashboard",
                              summary: "Create an interactive sales dashboard with revenue trends and customer analytics",
                              prompt: "Create an interactive sales dashboard with revenue trends and customer analytics",
                              image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
                            },
                            {
                              id: "game-1",
                              title: "Build a Game",
                              summary: "Build a web-based Frogger game with arrow key controls",
                              prompt: "Build a web-based Frogger game with arrow key controls",
                              image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop"
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatInterface
                    sessionId={currentSessionId}
                    initialPrompt={!isAuthenticated ? guestInitialPrompt : input}
                    isCanvasOpen={isCanvasOpen}
                    onCanvasToggle={handleCanvasToggle}
                    onArtifactChange={handleArtifactChange}
                    input={input}
                    onInputChange={setInput}
                    onSendMessage={handler => { chatSendHandlerRef.current = handler; }}
                    isGuest={!isAuthenticated}
                    guestMessageCount={guestSession.messageCount}
                    guestMaxMessages={guestSession.maxMessages}
                  />
                )}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </motion.div>
      )}

      {/* Guest limit dialog */}
      <GuestLimitDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
      />
    </>
  );
};

export default Home;
