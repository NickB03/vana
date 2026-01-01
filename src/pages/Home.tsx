import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { useScrollTransition } from "@/hooks/useScrollTransition";
import { useGuestSession } from "@/hooks/useGuestSession";
import { PageLayout } from "@/components/layout/PageLayout";
import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { ScrollIndicator } from "@/components/landing/ScrollIndicator";
import ScrollProgressBar from "@/components/ui/scroll-progress-bar";
import { RateLimitPopup } from "@/components/RateLimitPopup";
import { GuestLimitDialog } from "@/components/GuestLimitDialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { SidebarInset } from "@/components/ui/sidebar";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { ensureValidSession } from "@/utils/authHelpers";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { SuggestionItem } from "@/data/suggestions";
import { TourProvider, TourAlertDialog, TOUR_STORAGE_KEYS } from "@/components/tour";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useAppSetting, APP_SETTING_KEYS } from "@/hooks/useAppSettings";
import { MobileHeader } from "@/components/MobileHeader";
import { SparkleBackground } from "@/components/ui/sparkle-background";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { SparkleErrorBoundary } from "@/components/SparkleErrorBoundary";
import { useSparkleSettings } from "@/hooks/useSparkleSettings";
import { SparkleControlPanel } from "@/components/dev/SparkleControlPanel";

/**
 * Landing to app transition variants - Enhanced Cinematic Depth-of-Field Effect
 * Used for: Scroll-triggered page transformation with premium visual polish
 *
 * Design Philosophy:
 * - Dramatic depth perception through enhanced blur and scale
 * - Smooth timed animations (800ms) instead of instant scroll-driven updates
 * - Backdrop darkening creates professional "transition moment"
 * - Extended travel distance for more noticeable transformation
 */
const landingTransition = {
  landing: {
    fadeOut: {
      initial: { opacity: 1, y: 0, scale: 1 },
      transitioning: (progress: number) => ({
        opacity: 1 - progress,
        y: -100 * progress, // Doubled from 50px for more dramatic movement
        scale: 1 - 0.1 * progress, // Doubled from 0.05 for deeper zoom-out effect
      }),
      complete: { opacity: 0, y: -100, scale: 0.9 },
    },
    blurOut: {
      initial: { filter: 'blur(0px)' },
      transitioning: (progress: number) => ({
        filter: `blur(${20 * progress}px)`, // Doubled from 10px for stronger depth-of-field
      }),
      complete: { filter: 'blur(20px)' },
    },
  },
  app: {
    fadeIn: {
      initial: { opacity: 0, y: 100, scale: 0.9 }, // Start farther back for "emerging" effect
      transitioning: (progress: number) => ({
        opacity: progress,
        y: 100 - 100 * progress, // Doubled travel distance
        scale: 0.9 + 0.1 * progress, // Doubled scale change
      }),
      complete: { opacity: 1, y: 0, scale: 1 },
    },
  },
  // Backdrop overlay creates dramatic "moment of transition"
  backdrop: {
    initial: { opacity: 0 },
    transitioning: (progress: number) => {
      // Fade in to peak at 50% progress, then fade out
      const peakProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      return { opacity: peakProgress * 0.4 }; // Max 40% darkness
    },
    complete: { opacity: 0 },
  },
};

/**
 * Reduced motion variants (respects prefers-reduced-motion)
 * Gentle crossfade with minimal movement, no blur effects
 */
const landingTransitionReduced = {
  landing: {
    fadeOut: {
      initial: { opacity: 1 },
      transitioning: (progress: number) => ({ opacity: 1 - progress }),
      complete: { opacity: 0 },
    },
    blurOut: {
      initial: { filter: 'blur(0px)' },
      transitioning: () => ({ filter: 'blur(0px)' }), // No blur for reduced motion
      complete: { filter: 'blur(0px)' },
    },
  },
  app: {
    fadeIn: {
      initial: { opacity: 0 },
      transitioning: (progress: number) => ({ opacity: progress }),
      complete: { opacity: 1 },
    },
  },
  backdrop: {
    initial: { opacity: 0 },
    transitioning: () => ({ opacity: 0 }), // No backdrop for reduced motion
    complete: { opacity: 0 },
  },
};

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

  // Sparkle background settings - using custom hook
  const { settings: sparkleSettings, updateSetting: updateSparkleSetting, reset: resetSparkleSettings, resetCounter } = useSparkleSettings();

  // Sparkle control panel state
  const [sparkleControlMinimized, setSparkleControlMinimized] = useState(false);

  // Layout position controls (for tweaking before locking in)
  const [promptPosition, setPromptPosition] = useState(63); // Desktop default: 63% from top
  const [mobilePromptPosition, setMobilePromptPosition] = useState(71); // Mobile default: 71% from top

  const handleSparkleReset = useCallback(() => {
    resetSparkleSettings();
    // Reset layout positions
    setPromptPosition(63);
    setMobilePromptPosition(71);
  }, [resetSparkleSettings]);

  // Chat state
  const { sessions, isLoading: sessionsLoading, createSession, deleteSession } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [guestInitialPrompt, setGuestInitialPrompt] = useState<string | undefined>();
  const [pendingAuthPrompt, setPendingAuthPrompt] = useState<string | undefined>(); // For authenticated users
  const [autoOpenCanvas, setAutoOpenCanvas] = useState(false);
  const [loadingSuggestionId, setLoadingSuggestionId] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatSendHandlerRef = useRef<((message?: string) => Promise<void>) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTourDialog, setShowTourDialog] = useState(false);

  // Guest session
  const guestSession = useGuestSession(isAuthenticated);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Global app settings (from database)
  const { value: forceTourSetting, isLoading: forceTourLoading } = useAppSetting(APP_SETTING_KEYS.FORCE_TOUR);
  const { value: landingPageSetting, isLoading: landingSettingLoading } = useAppSetting(APP_SETTING_KEYS.LANDING_PAGE_ENABLED);

  // Memoize guest session functions to prevent unnecessary re-renders
  const guestSessionMemo = useMemo(() => ({
    saveMessages: guestSession.saveMessages,
    loadMessages: guestSession.loadMessages,
    clearMessages: guestSession.clearMessages,
  }), [guestSession.saveMessages, guestSession.loadMessages, guestSession.clearMessages]);

  // Lazy loaded suggestions
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Scroll transition - triggers at the end of CTA section
  // Admin dashboard is the single source of truth for landing page setting
  // During loading, use the default (false = skip landing) to prevent flash
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const skipLandingPage = !(landingPageSetting?.enabled ?? false);
  const { phase, progress, setTriggerElement } = useScrollTransition({
    enabled: true,
    skipLanding: skipLandingPage,
  });

  // Detect reduced motion preference (lazy init to avoid flash)
  const [prefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
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
      import('@/data/suggestions')
        .then(({ suggestions: loadedSuggestions }) => {
          setSuggestions(loadedSuggestions);
          setLoadingSuggestions(false);
        })
        .catch((error) => {
          console.error('[Home] Failed to load suggestions:', error);
          setLoadingSuggestions(false);
          // Graceful degradation - empty suggestions is acceptable
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

  // Check if user should see the onboarding tour
  useEffect(() => {
    // Wait for settings to load before deciding on tour
    if (forceTourLoading) return;

    // Only show tour prompt when app phase is stable
    if (phase === "app" && !showChat) {
      const tourKey = `${TOUR_STORAGE_KEYS.TOUR_STATE_PREFIX}vana-app-onboarding`;
      try {
        // Check for ?skipTour=true query param (for E2E tests)
        const skipTour = new URLSearchParams(window.location.search).get('skipTour') === 'true';
        if (skipTour) {
          // Mark tour as completed to prevent it from showing
          localStorage.setItem(tourKey, JSON.stringify({ completed: true }));
          return;
        }

        // Check if admin has enabled force tour mode (from database - affects ALL users)
        const forceTourEnabled = forceTourSetting?.enabled ?? false;

        if (forceTourEnabled) {
          // Clear tour completion state to force it to show
          localStorage.removeItem(tourKey);
          // Show the tour dialog
          const timer = setTimeout(() => setShowTourDialog(true), 500);
          return () => clearTimeout(timer);
        }

        // Normal behavior: only show tour for new users
        const savedState = localStorage.getItem(tourKey);
        let hasCompletedTour = false;
        if (savedState) {
          try {
            hasCompletedTour = JSON.parse(savedState).completed ?? false;
          } catch {
            // Malformed JSON - treat as incomplete tour
          }
        }
        if (!hasCompletedTour) {
          // Delay showing dialog for smoother UX after transition
          const timer = setTimeout(() => setShowTourDialog(true), 500);
          return () => clearTimeout(timer);
        }
      } catch {
        // If localStorage access fails entirely, don't show tour
      }
    }
  }, [phase, showChat, forceTourSetting, forceTourLoading]);

  // Auto-collapse sidebar when canvas opens
  useEffect(() => {
    if (isCanvasOpen) {
      setSidebarOpen(false);
    }
  }, [isCanvasOpen]);

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
    setImageMode(false);
    setArtifactMode(false);
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
      const promptToSend = input; // Capture before clearing
      try {
        const sessionId = await createSession(promptToSend);
        if (sessionId) {
          setCurrentSessionId(sessionId);
          // Set pending prompt for ChatInterface to auto-send
          setPendingAuthPrompt(promptToSend);
          setInput(""); // Clear input to prevent double-send
          setShowChat(true);
          // imageMode will be passed to ChatInterface via initialImageMode prop
        }
      } catch (error) {
        console.error('[Home] Failed to create session:', error);
        toast({
          title: "Failed to start chat",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [input, isAuthenticated, guestSession, showChat, toast, navigate, createSession]);

  /**
   * Handles instant build when clicking suggestion cards
   * Immediately starts building artifact without manual send
   */
  const handleSuggestionClick = useCallback(async (item: SuggestionItem) => {
    // Set loading state for the clicked card
    setLoadingSuggestionId(item.id);

    // Show immediate feedback
    toast({
      title: "Starting your project...",
      description: "Building your artifact",
    });

    // Enable artifact mode ONLY for artifact cards (not image generation)
    // Image generation cards have IDs starting with 'img-gen-'
    if (!item.id.startsWith('img-gen-')) {
      setArtifactMode(true);
      // Set flag to auto-open canvas when artifact is detected
      setAutoOpenCanvas(true);
    }

    // Check guest limit
    if (!isAuthenticated && !guestSession.canSendMessage) {
      setLoadingSuggestionId(null);
      setShowLimitDialog(true);
      return;
    }

    const prompt = item.prompt || item.summary;

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
      try {
        const sessionId = await createSession(prompt);
        if (sessionId) {
          setCurrentSessionId(sessionId);
          // Use pendingAuthPrompt instead of input to prevent auto-send bugs
          setPendingAuthPrompt(prompt);
          setInput(""); // Clear input so it doesn't persist and re-trigger
          setShowChat(true);
        }
      } catch (error) {
        console.error('[Home] Failed to create session:', error);
        toast({
          title: "Failed to start chat",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setLoadingSuggestionId(null);
      }
    }
  }, [isAuthenticated, guestSession, toast, navigate, createSession]);

  /**
   * Toggles or sets artifact canvas visibility
   * @param open - Optional explicit state. If undefined, toggles current state.
   */
  const handleCanvasToggle = useCallback((open?: boolean) => {
    // No guard needed - "Open" button only appears when artifact exists
    // If explicit state provided, use it; otherwise toggle
    const newState = open !== undefined ? open : !isCanvasOpen;
    setIsCanvasOpen(newState);
  }, [isCanvasOpen]);

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
      showGradient={false}
      enableEntranceAnimation={false}
      showSparkleBackground={false}  /* Render sparkle inside SidebarInset for proper centering */
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
        <TourProvider
          tourId="vana-app-onboarding"
          onComplete={() => {
            console.log("[Tour] User completed onboarding tour");
          }}
          onSkip={(completedSteps) => {
            console.log(`[Tour] User skipped after ${completedSteps} steps`);
          }}
        >
          <OnboardingTour />
          <TourAlertDialog isOpen={showTourDialog} setIsOpen={setShowTourDialog} />
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
            <SidebarProvider
              defaultOpen={true}
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
            >
              <ChatSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSessionSelect={handleSessionSelect}
                onNewChat={handleNewChat}
                onDeleteSession={deleteSession}
                isLoading={sessionsLoading}
              />

              <SidebarInset className="relative bg-zinc-950 overflow-hidden">
                {/* Sparkle background - positioned relative to SidebarInset for proper centering */}
                <SparkleErrorBoundary resetKey={resetCounter}>
                  <SparkleBackground position="absolute" {...sparkleSettings} />
                </SparkleErrorBoundary>
                <main className="flex h-[100dvh] flex-col overflow-hidden relative z-10">
                  {/* Mobile Header - Gemini-style hamburger menu */}
                  <MobileHeader isAuthenticated={isAuthenticated} />

                  {/* Main Content */}
                  <div className="flex-1 overflow-hidden flex flex-col max-h-full">
                    {!showChat ? (
                      <ChatLayout
                        input={input}
                        onInputChange={setInput}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        suggestions={suggestions}
                        loadingSuggestions={loadingSuggestions}
                        loadingItemId={loadingSuggestionId}
                        onSuggestionClick={handleSuggestionClick}
                        imageMode={imageMode}
                        onImageModeChange={setImageMode}
                        artifactMode={artifactMode}
                        onArtifactModeChange={setArtifactMode}
                        sendIcon="send"
                        promptPosition={promptPosition}
                        mobilePromptPosition={mobilePromptPosition}
                      />
                    ) : (
                      <ChatInterface
                        sessionId={currentSessionId ?? guestSession.sessionId ?? undefined}
                        initialPrompt={!isAuthenticated ? guestInitialPrompt : pendingAuthPrompt}
                        initialImageMode={imageMode}
                        initialArtifactMode={artifactMode}
                        isCanvasOpen={isCanvasOpen}
                        onCanvasToggle={handleCanvasToggle}
                        onArtifactChange={handleArtifactChange}
                        input={input}
                        onInputChange={setInput}
                        onSendMessage={handler => {
                          chatSendHandlerRef.current = handler;
                        }}
                        onInitialPromptSent={() => {
                          // Clear pending prompts only after they have been sent
                          setGuestInitialPrompt(undefined);
                          setPendingAuthPrompt(undefined);
                        }}
                        isGuest={!isAuthenticated}
                        guestMessageCount={guestSession.messageCount}
                        guestMaxMessages={guestSession.maxMessages}
                        guestSession={guestSessionMemo}
                      />
                    )}
                  </div>
                </main>
              </SidebarInset>
            </SidebarProvider>
          </motion.div>
        </TourProvider>
      )}

      {/* Guest limit dialog */}
      <GuestLimitDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
      />

      {/* Sparkle Controls Panel - controlled by feature flag */}
      {FEATURE_FLAGS.SPARKLE_CONTROLS_PANEL && (
        <SparkleControlPanel
          sparkleSettings={sparkleSettings}
          onUpdateSetting={updateSparkleSetting}
          onReset={handleSparkleReset}
          promptPosition={promptPosition}
          onPromptPositionChange={setPromptPosition}
          mobilePromptPosition={mobilePromptPosition}
          onMobilePromptPositionChange={setMobilePromptPosition}
          minimized={sparkleControlMinimized}
          onMinimizedChange={setSparkleControlMinimized}
        />
      )}
    </PageLayout>
  );
};

export default Home;
