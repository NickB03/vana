import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGuestSession } from "@/hooks/useGuestSession";
import { PageLayout } from "@/components/layout/PageLayout";
import { GuestLimitDialog } from "@/components/GuestLimitDialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { SidebarInset } from "@/components/ui/sidebar";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { ensureValidSession } from "@/utils/authHelpers";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { SuggestionItem } from "@/data/suggestions";
import { TourProvider, TourAlertDialog, TOUR_STORAGE_KEYS } from "@/components/tour";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useAppSetting, APP_SETTING_KEYS } from "@/hooks/useAppSettings";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopHeader } from "@/components/DesktopHeader";
import { SparkleBackground } from "@/components/ui/sparkle-background";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { SparkleErrorBoundary } from "@/components/SparkleErrorBoundary";
import { useSparkleSettings } from "@/hooks/useSparkleSettings";
import { SparkleControlPanel } from "@/components/dev/SparkleControlPanel";

/**
 * Home Page - Main app experience
 *
 * Features:
 * - Direct app interface (landing page disabled)
 * - Guest mode with 5 message limit
 * - Onboarding tour for new users
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
  const [mobilePromptPosition, setMobilePromptPosition] = useState(58); // Mobile default: 58% from top

  const handleSparkleReset = useCallback(() => {
    resetSparkleSettings();
    // Reset layout positions
    setPromptPosition(63);
    setMobilePromptPosition(58);
  }, [resetSparkleSettings]);

  // Chat state
  const { sessions, isLoading: sessionsLoading, createSession, deleteSession } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [_hasArtifact, setHasArtifact] = useState(false);
  const [guestInitialPrompt, setGuestInitialPrompt] = useState<string | undefined>();
  const [pendingAuthPrompt, setPendingAuthPrompt] = useState<string | undefined>(); // For authenticated users
  const [autoOpenCanvas, setAutoOpenCanvas] = useState(false);
  const [loadingSuggestionId, setLoadingSuggestionId] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatSendHandlerRef = useRef<((message?: string) => Promise<void>) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showTourDialog, setShowTourDialog] = useState(false);

  // Ref for autoOpenCanvas to avoid re-creating handleArtifactChange callback
  const autoOpenCanvasRef = useRef(autoOpenCanvas);
  useEffect(() => {
    autoOpenCanvasRef.current = autoOpenCanvas;
  }, [autoOpenCanvas]);

  // Guest session
  const guestSession = useGuestSession(isAuthenticated);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Global app settings (from database)
  const { value: forceTourSetting, isLoading: forceTourLoading } = useAppSetting(APP_SETTING_KEYS.FORCE_TOUR);

  // Memoize guest session functions to prevent unnecessary re-renders
  const guestSessionMemo = useMemo(() => ({
    saveMessages: guestSession.saveMessages,
    loadMessages: guestSession.loadMessages,
    clearMessages: guestSession.clearMessages,
  }), [guestSession.saveMessages, guestSession.loadMessages, guestSession.clearMessages]);

  // Lazy loaded suggestions
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

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

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Simple session check without refresh attempt
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    // Show tour prompt on app interface (no landing page phase anymore)
    if (!showChat) {
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
          // Delay showing dialog for smoother UX
          const timer = setTimeout(() => setShowTourDialog(true), 500);
          return () => clearTimeout(timer);
        }
      } catch {
        // If localStorage access fails entirely, don't show tour
      }
    }
  }, [showChat, forceTourSetting, forceTourLoading]);

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
   * Handles file upload from home input
   * Validates file, uploads to Supabase storage, and adds reference to input
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      // Validate file with comprehensive checks
      const validationResult = await validateFile(file);
      if (!validationResult.valid) {
        toast({ title: validationResult.error || "File validation failed", variant: "destructive" });
        return;
      }

      const session = await ensureValidSession();
      if (!session) {
        toast({ title: "Authentication required. Please refresh the page or sign in again.", variant: "destructive" });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();

      // Sanitize filename and create upload path
      const sanitized = sanitizeFilename(file.name);
      const fileExt = sanitized.substring(sanitized.lastIndexOf('.'));
      const fileName = `${user.id}/${Date.now()}${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL (7 days expiry) for private bucket access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(fileName, 604800); // 7 days = 604800 seconds

      if (urlError) {
        throw new Error(`Failed to generate secure URL: ${urlError.message}`);
      }

      if (!signedUrlData?.signedUrl) {
        throw new Error('Failed to generate secure URL: No URL returned from storage service');
      }

      // Add file reference to input
      setInput(prev => `${prev}\n[${file.name}](${signedUrlData.signedUrl})`);

      toast({ title: "File uploaded successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("File upload error:", {
        error: errorMessage,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });

      // Provide user-friendly error message based on the error type
      if (errorMessage.includes('secure URL')) {
        toast({ title: `Upload succeeded but URL generation failed: ${errorMessage}`, variant: "destructive" });
      } else if (errorMessage.includes('File too large')) {
        toast({ title: 'File is too large. Maximum size is 100MB.', variant: "destructive" });
      } else if (errorMessage.includes('Invalid file type')) {
        toast({ title: 'Invalid file type. Supported types: images, documents, text files.', variant: "destructive" });
      } else {
        toast({ title: `Failed to upload file: ${errorMessage}`, variant: "destructive" });
      }
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [toast, setInput]);

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
   *
   * Uses autoOpenCanvasRef to avoid re-creating this callback on every render,
   * which helps prevent unnecessary re-renders and stream cancellation issues.
   */
  const handleArtifactChange = useCallback((hasContent: boolean) => {
    setHasArtifact(hasContent);
    if (!hasContent) {
      setIsCanvasOpen(false);
    } else if (autoOpenCanvasRef.current) {
      // Auto-open canvas when artifact is detected (from suggestion click)
      setIsCanvasOpen(true);
      autoOpenCanvasRef.current = false; // Sync ref immediately for rapid calls
      setAutoOpenCanvas(false); // Also update state
    }
    // Empty dependency array - uses ref pattern for stable callback identity
  }, []);

  return (
    <PageLayout
      shaderOpacityClassName=""
      showGradient={false}
      enableEntranceAnimation={false}
      showSparkleBackground={false}  /* Render sparkle inside SidebarInset for proper centering */
    >
      {/* Global shader background and subtle gradient are provided by PageLayout */}

      {/* App interface - renders directly without landing page transition */}
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
        <div className="relative min-h-[var(--app-height)]">
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

            <SidebarInset className="relative bg-black overflow-hidden">
              {/* Sparkle background - positioned relative to SidebarInset for proper centering */}
              <SparkleErrorBoundary resetKey={resetCounter}>
                <SparkleBackground position="absolute" {...sparkleSettings} />
              </SparkleErrorBoundary>
              <main className="flex h-[var(--app-height)] flex-col overflow-hidden relative z-10">
                {/* Mobile Header - Gemini-style hamburger menu */}
                <MobileHeader isAuthenticated={isAuthenticated} />

                {/* Desktop Header - Sign in button (top-right corner) */}
                <DesktopHeader isAuthenticated={isAuthenticated} />

                {/* Main Content - AnimatePresence for smooth crossfade between views */}
                <div className="flex-1 overflow-hidden flex flex-col max-h-full">
                  <AnimatePresence mode="wait">
                    {!showChat ? (
                      <motion.div
                        key="chat-layout"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="flex-1 flex flex-col min-h-0"
                      >
                        <ChatLayout
                          input={input}
                          onInputChange={setInput}
                          onSubmit={handleSubmit}
                          isLoading={isLoading}
                          suggestions={suggestions}
                          loadingSuggestions={loadingSuggestions}
                          loadingItemId={loadingSuggestionId}
                          onSuggestionClick={handleSuggestionClick}
                          fileInputRef={fileInputRef}
                          isUploadingFile={isUploadingFile}
                          onFileUpload={handleFileUpload}
                          imageMode={imageMode}
                          onImageModeChange={setImageMode}
                          artifactMode={artifactMode}
                          onArtifactModeChange={setArtifactMode}
                          promptPosition={promptPosition}
                          mobilePromptPosition={mobilePromptPosition}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`chat-interface-${currentSessionId ?? 'guest'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="flex-1 flex flex-col min-h-0"
                      >
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </TourProvider>

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
