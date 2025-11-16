import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useScrollTransition } from "@/hooks/useScrollTransition";
import { useGuestSession } from "@/hooks/useGuestSession";
import { landingTransition, landingTransitionReduced } from "@/utils/animationConstants";
import { PageLayout } from "@/components/layout/PageLayout";
import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { ScrollIndicator } from "@/components/landing/ScrollIndicator";
import ScrollProgressBar from "@/components/ui/scroll-progress-bar";
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
import { cn } from "@/lib/utils";
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import GalleryHoverCarousel from "@/components/ui/gallery-hover-carousel";
import type { SuggestionItem } from "@/data/suggestions";

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
  const [autoOpenCanvas, setAutoOpenCanvas] = useState(false);
  const [loadingSuggestionId, setLoadingSuggestionId] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);
  const chatSendHandlerRef = useRef<((message?: string) => Promise<void>) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lazy loaded suggestions
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Scroll transition - triggers at the end of CTA section
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const { phase, progress, setTriggerElement } = useScrollTransition(true);

  // Guest session
  const guestSession = useGuestSession(isAuthenticated);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Detect reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitions = prefersReducedMotion ? landingTransitionReduced : landingTransition;

  // Track if user has scrolled (for scroll indicator visibility)
  const [hasScrolled, setHasScrolled] = useState(false);

  // Detect initial scroll to hide indicator
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lazy load suggestions after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/data/suggestions').then(({ suggestions: loadedSuggestions }) => {
        setSuggestions(loadedSuggestions);
        setLoadingSuggestions(false);
      });
    }, 100); // Small delay to prioritize critical rendering

    return () => clearTimeout(timer);
  }, []);

  // Set trigger element for scroll detection - CTA section marks the end of landing content
  useEffect(() => {
    if (ctaSectionRef.current) {
      setTriggerElement(ctaSectionRef.current);
    }
  }, [setTriggerElement]);

  /**
   * Smooth scroll to showcase section when indicator is clicked
   */
  const handleScrollIndicatorClick = useCallback(() => {
    const showcaseSection = document.getElementById("showcase");
    if (showcaseSection) {
      showcaseSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setHasScrolled(true);
    }
  }, []);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Simple session check without refresh attempt
      const { data: { session } } = await supabase.auth.getSession();
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
    setAutoOpenCanvas(false);
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
      // imageMode will be passed to ChatInterface via initialImageMode prop
      // It will be reset after ChatInterface handles the initial message
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
        // imageMode will be passed to ChatInterface via initialImageMode prop
      }
      setIsLoading(false);
    }
  }, [input, isAuthenticated, guestSession, showChat, toast, navigate, createSession]);

  /**
   * Handles instant build when clicking suggestion cards
   * Immediately starts building artifact without manual send
   */
  const handleSuggestionClick = useCallback(async (prompt: string, cardId: string) => {
    // Set loading state for the clicked card
    setLoadingSuggestionId(cardId);

    // Show immediate feedback
    toast({
      title: "Starting your project...",
      description: "Building your artifact",
    });

    // Set flag to auto-open canvas when artifact is detected
    setAutoOpenCanvas(true);

    // Check guest limit
    if (!isAuthenticated && !guestSession.canSendMessage) {
      setLoadingSuggestionId(null);
      setShowLimitDialog(true);
      return;
    }

    // For guests: show chat and send via initialPrompt mechanism
    if (!isAuthenticated) {
      setGuestInitialPrompt(prompt);
      setShowChat(true);
      guestSession.incrementMessageCount();
      setLoadingSuggestionId(null);
    } else {
      // For authenticated users: create session and show chat
      const session = await ensureValidSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please refresh the page or sign in again",
          variant: "destructive",
        });
        setIsAuthenticated(false);
        navigate("/auth");
        setLoadingSuggestionId(null);
        return;
      }

      setIsLoading(true);
      const sessionId = await createSession(prompt);
      if (sessionId) {
        setCurrentSessionId(sessionId);
        setInput(prompt); // Set input so ChatInterface receives the prompt via initialPrompt prop
        setShowChat(true);
      }
      setIsLoading(false);
      setLoadingSuggestionId(null);
    }
  }, [isAuthenticated, guestSession, toast, navigate, createSession]);

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
   * Auto-opens canvas if triggered from suggestion click
   */
  const handleArtifactChange = useCallback((hasContent: boolean) => {
    setHasArtifact(hasContent);
    if (!hasContent) {
      setIsCanvasOpen(false);
    } else if (autoOpenCanvas) {
      // Auto-open canvas when artifact is detected (from suggestion click)
      setIsCanvasOpen(true);
      setAutoOpenCanvas(false); // Reset flag after opening
    }
  }, [autoOpenCanvas]);

  // Determine what content to show based on transition phase
  const showLanding = phase !== "app";
  const showApp = phase !== "landing";
  const isTransitioning = phase === "transitioning";

  return (
    <PageLayout
      shaderOpacityClassName=""
      gradientStyle={{
        background:
          "radial-gradient(125% 125% at 50% 10%, transparent 40%, rgba(30, 41, 59, 0.2) 100%)",
      }}
      enableEntranceAnimation={false}
    >
      {/* Global shader background and subtle gradient are provided by PageLayout */}

      {/* Backdrop overlay - creates dramatic transition moment */}
      {phase !== "landing" && (
        <motion.div
          className="fixed inset-0 bg-black pointer-events-none"
          style={{ zIndex: 40 }}
          initial={transitions.backdrop.initial}
          animate={
            isTransitioning
              ? transitions.backdrop.transitioning(progress)
              : phase === "app"
              ? transitions.backdrop.complete
              : transitions.backdrop.initial
          }
          transition={{ duration: 0 }}
        />
      )}

      {/* Landing page content - renders in normal flow for scrolling */}
      {phase !== "app" && (
        <div className="relative">

          {/* Content layer - affected by blur and fade */}
          <motion.div
            style={{
              pointerEvents: phase === "landing" ? "auto" : "none",
            }}
            initial={{
              ...transitions.landing.fadeOut.initial,
              ...transitions.landing.blurOut.initial,
            }}
            animate={{
              ...(isTransitioning
                ? transitions.landing.fadeOut.transitioning(progress)
                : phase === "landing"
                ? transitions.landing.fadeOut.initial
                : transitions.landing.fadeOut.complete),
              ...(isTransitioning
                ? transitions.landing.blurOut.transitioning(progress)
                : phase === "landing"
                ? transitions.landing.blurOut.initial
                : transitions.landing.blurOut.complete),
            }}
            transition={{ duration: 0 }}
          >
            <Hero />
            <div id="showcase">
              <ShowcaseSection />
            </div>
            <BenefitsSection />
            <div ref={ctaSectionRef}>
              <CTASection />
            </div>
            {/* Spacer to allow scrolling past CTA section for transition trigger */}
            <div className="h-[100vh]" />
          </motion.div>

          {/* Scroll indicator - only visible on landing phase before user scrolls */}
          <ScrollIndicator
            visible={phase === "landing" && !hasScrolled}
            onClick={handleScrollIndicatorClick}
          />

          {/* Scroll progress bar - shows progress through landing page */}
          {phase === "landing" && (
            <ScrollProgressBar
              type="circle"
              position="bottom-right"
              strokeSize={3}
              showPercentage={false}
            />
          )}
        </div>
      )}

      {/* App interface - fixed overlay during transition, normal flow when complete */}
      {phase !== "landing" && (
        <motion.div
          className={phase === "app" ? "relative min-h-screen" : "fixed inset-0 z-50"}
          style={{
            pointerEvents: phase !== "landing" ? "auto" : "none",
          }}
          initial={transitions.app.fadeIn.initial}
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

            <SidebarInset className="relative bg-transparent">
            <main className="flex h-[100dvh] flex-col overflow-hidden">
              {/* Header */}
              <header className="bg-black/50 backdrop-blur-sm border-b border-border/30 sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between gap-2 px-4">
                {/* Guest limit banner */}
                {!isAuthenticated && guestSession.messageCount > 0 && (
                  <div className="flex-1 max-w-md">
                    <GuestLimitBanner
                      messageCount={guestSession.messageCount}
                      maxMessages={guestSession.maxMessages}
                    />
                  </div>
                )}

              </header>

              {/* Main Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {!showChat ? (
                  <div className="flex h-full flex-col items-center justify-between overflow-y-auto p-4 sm:p-8 pt-safe pb-safe">
                    <div></div>

                    <div className="text-center w-full">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
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
                          className="w-full relative rounded-xl bg-black/50 backdrop-blur-sm p-0 pt-1"
                        >
                          <div className="flex flex-col">
                            <PromptInputTextarea
                              placeholder="Ask anything"
                              className="min-h-[44px] pl-4 pt-3 text-base leading-[1.3]"
                            />
                            <PromptInputControls
                              className="mt-5 px-3 pb-3"
                              imageMode={imageMode}
                              onImageModeChange={setImageMode}
                              artifactMode={artifactMode}
                              onArtifactModeChange={setArtifactMode}
                              isLoading={isLoading}
                              input={input}
                              onSend={handleSubmit}
                              sendIcon="send"
                            />
                          </div>
                        </PromptInput>
                      </div>

                      <div className="w-full px-4 pb-4">
                        {loadingSuggestions ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-lg" />
                            ))}
                          </div>
                        ) : (
                        <GalleryHoverCarousel
                          heading=""
                          className="py-0 bg-transparent"
                          onItemClick={(item) => handleSuggestionClick(item.prompt || item.summary, item.id)}
                          loadingItemId={loadingSuggestionId}
                          items={suggestions}
                        />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatInterface
                    sessionId={currentSessionId}
                    initialPrompt={!isAuthenticated ? guestInitialPrompt : input}
                    initialImageMode={imageMode}
                    initialArtifactMode={artifactMode}
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
    </PageLayout>
  );
};

export default Home;
