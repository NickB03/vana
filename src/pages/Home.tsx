import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useScrollTransition } from "@/hooks/useScrollTransition";
import { useGuestSession } from "@/hooks/useGuestSession";
import { landingTransition, landingTransitionReduced } from "@/utils/animationConstants";
import { GradientBackground } from "@/components/ui/bg-gredient";
import { Hero } from "@/components/landing/Hero";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
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
  const [autoOpenCanvas, setAutoOpenCanvas] = useState(false);
  const chatSendHandlerRef = useRef<((message?: string) => Promise<void>) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll transition - triggers at the end of CTA section
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const { phase, progress, setTriggerElement } = useScrollTransition(true);

  // Guest session
  const guestSession = useGuestSession(isAuthenticated);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Detect reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitions = prefersReducedMotion ? landingTransitionReduced : landingTransition;


  // Set trigger element for scroll detection - CTA section marks the end of landing content
  useEffect(() => {
    if (ctaSectionRef.current) {
      setTriggerElement(ctaSectionRef.current);
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
   * Handles instant build when clicking suggestion cards
   * Immediately starts building artifact without manual send
   */
  const handleSuggestionClick = useCallback(async (prompt: string) => {
    // Show immediate feedback
    toast({
      title: "Starting your project...",
      description: "Building your artifact",
    });

    // Set flag to auto-open canvas when artifact is detected
    setAutoOpenCanvas(true);

    // Check guest limit
    if (!isAuthenticated && !guestSession.canSendMessage) {
      setShowLimitDialog(true);
      return;
    }

    // For guests: show chat and send via initialPrompt mechanism
    if (!isAuthenticated) {
      setGuestInitialPrompt(prompt);
      setShowChat(true);
      guestSession.incrementMessageCount();
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
        return;
      }

      setIsLoading(true);
      const sessionId = await createSession(prompt);
      if (sessionId) {
        setCurrentSessionId(sessionId);
        setShowChat(true);
      }
      setIsLoading(false);
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
          <BenefitsSection />
          <div ref={ctaSectionRef}>
            <CTASection />
          </div>
          {/* Spacer to allow scrolling past CTA section for transition trigger */}
          <div className="h-[100vh]" />
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
                            // Image Generation (5 options)
                            {
                              id: "img-gen-1",
                              title: "Retro Character Art",
                              summary: "Pixel art image: Pikachu in banana costume on tropical beach with palm trees, 16-bit aesthetic, yellow/orange palette",
                              prompt: "Generate an image. Context: Creating retro gaming fan art. Task: Pikachu character wearing a full banana costume. Setting: Sunny tropical beach with palm trees and coconuts in background. Style: 16-bit pixel art aesthetic. Colors: Bright yellow and orange dominant palette. Quality: Crisp pixel definition, nostalgic gaming feel.",
                              image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop"
                            },
                            {
                              id: "img-gen-2",
                              title: "Cyberpunk Cityscape",
                              summary: "Futuristic city at sunset: neon skyscrapers, flying cars with light trails, holographic ads, rain-slicked streets",
                              prompt: "Generate an image. Context: Concept art for cyberpunk game. Task: Create a breathtaking city scene. Time: Golden hour sunset. Elements: Neon-lit skyscrapers, flying cars leaving light trails, holographic billboards, rain-slicked streets reflecting lights. Colors: Purple and pink neon dominance. Composition: Cinematic wide angle. Mood: Dystopian but beautiful.",
                              image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop"
                            },
                            {
                              id: "img-gen-3",
                              title: "Fantasy Warrior",
                              summary: "Elven warrior in glowing silver armor with runes, enchanted forest with bioluminescent plants, ethereal atmosphere",
                              prompt: "Generate an image. Context: Fantasy RPG character portrait. Task: Female elven warrior in mystical forest. Armor: Luminescent silver with ancient glowing runes. Environment: Enchanted forest with bioluminescent plants, magical fireflies, ethereal mist. Lighting: Dramatic rim lighting from behind. Style: Photorealistic fantasy art. Atmosphere: Magical and mysterious.",
                              image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop"
                            },
                            {
                              id: "img-gen-4",
                              title: "Sci-Fi Movie Poster",
                              summary: "Movie poster 'Silicon Awakening': massive AI computer core with glowing circuits, human silhouettes, storm clouds",
                              prompt: "Generate an image. Context: Promotional poster for AI thriller movie. Title: 'Silicon Awakening'. Main Element: Massive quantum computer core with glowing blue circuits. Foreground: Silhouettes of people looking up. Background: Ominous storm clouds. Typography: Bold, futuristic title treatment. Color Grading: Dark moody tones with electric blue accents. Style: Professional movie poster aesthetic.",
                              image: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=300&fit=crop"
                            },
                            {
                              id: "img-gen-5",
                              title: "Product Photography",
                              summary: "Premium smartwatch with holographic display showing health data, titanium/rose gold, floating with studio lighting",
                              prompt: "Generate an image. Context: Luxury tech product advertisement. Product: Modern smartwatch with holographic transparent display. Display Content: Health metrics and vital signs. Materials: Curved sapphire glass, titanium body, rose gold accents. Presentation: Floating in space (no background). Lighting: Soft professional studio lighting. Quality: 8K resolution, premium product photography aesthetic. Mood: Futuristic and luxurious.",
                              image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                            },
                            // Web Apps (5 options)
                            {
                              id: "web-app-1",
                              title: "Todo List App",
                              summary: "React todo app: drag-and-drop reorder, priority tags, category filters, due dates, Radix UI Dialog, dark mode",
                              prompt: "Build a React artifact. Context: Personal productivity tool. Task: Create a modern todo list application. Features: Add/edit/delete tasks, drag-and-drop reordering, color-coded priority badges (high=red, medium=yellow, low=green), category filters (work/personal/health), due date picker. UI Components: Use Radix UI Dialog for add/edit modals, Radix UI Tabs for category switching. State: Use React useState (no localStorage). Styling: Glassmorphism UI with Tailwind CSS, dark mode support. Animations: Smooth completion checkmarks, task deletion fade-out.",
                              image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop"
                            },
                            {
                              id: "web-app-2",
                              title: "Nutrition Tracker",
                              summary: "React protein/macro tracker: meal logging, progress rings for macros, food database, Recharts weekly trends",
                              prompt: "Build a React artifact. Context: Fitness and nutrition tracking. Task: Create a protein and nutrition tracker. Core Features: Meal logging form, macro breakdown (protein/carbs/fats), daily goal setting, meal history with timestamps, searchable food database. Visualizations: Colorful circular progress rings for each macro, Recharts line chart showing weekly protein intake trends. State Management: React useState for in-memory data. Styling: Clean card-based layout with Tailwind CSS, gradient accent colors. Interactions: Smooth animations on progress updates, hover effects on meal entries.",
                              image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop"
                            },
                            {
                              id: "web-app-3",
                              title: "Budget Tracker",
                              summary: "React finance tracker: expense entry with Radix UI, spending categories, visual budgets, Recharts pie chart",
                              prompt: "Build a React artifact. Context: Personal finance management. Task: Create a budget tracking application. Features: Expense entry form, categorized spending (food/transport/entertainment/bills), monthly budget limits, visual progress bars for each category, transaction history table with sort/filter. UI Components: Radix UI Dialog for expense entry, Radix UI Select for categories. Charts: Recharts pie chart showing spending breakdown. Export: Generate CSV download of transactions. Styling: Professional financial dashboard aesthetic with Tailwind CSS, green=under budget, red=over budget color coding.",
                              image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop"
                            },
                            {
                              id: "web-app-4",
                              title: "Recipe Manager",
                              summary: "React recipe book: add/edit via Radix Dialog, ingredient checklists, cooking timer, search/filter by cuisine",
                              prompt: "Build a React artifact. Context: Digital cookbook application. Task: Create a recipe management system. Features: Add/edit recipes, ingredient list with checkboxes, step-by-step instructions, built-in countdown timer with audio alerts, serving size calculator (adjusts ingredient quantities), recipe search and filter by cuisine type (Italian/Mexican/Asian/American). UI: Radix UI Dialog for recipe forms, beautiful card grid layout. Storage: React useState (no localStorage). Styling: Food-themed warm color palette with Tailwind CSS, placeholder food images, modern card design with hover effects.",
                              image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop"
                            },
                            {
                              id: "web-app-5",
                              title: "Workout Logger",
                              summary: "React workout tracker: exercise library by muscle group, sets/reps input, rest timer, Recharts progress",
                              prompt: "Build a React artifact. Context: Gym workout tracking application. Task: Create a comprehensive workout logger. Features: Exercise library categorized by muscle group, workout session builder with sets/reps/weight inputs, countdown rest timer between sets, personal records tracking, workout history calendar view. Visualizations: Recharts line chart showing strength progression over time, bar chart for volume per muscle group. UI: Radix UI Tabs for muscle groups, Radix UI Dialog for exercise selection. Gamification: Achievement badges with celebration animations (Framer Motion) when PR is hit. Styling: Fitness-inspired bold design with Tailwind CSS.",
                              image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=300&fit=crop"
                            },
                            // Data Visualization (5 options)
                            {
                              id: "data-viz-1",
                              title: "Sales Dashboard",
                              summary: "React sales analytics: Recharts multi-line revenue trends, donut chart by category, top products bar chart, KPI cards",
                              prompt: "Build a React artifact. Context: Business intelligence dashboard. Task: Create a sales analytics visualization. Library: Use Recharts exclusively. Charts: 1) Multi-line chart for revenue trends with toggle for monthly/quarterly/yearly views, 2) Donut chart showing sales distribution by product category, 3) Horizontal bar chart for top 10 products. KPIs: Cards showing total revenue, growth percentage, average order value with up/down indicators. Interactions: Date range selector using Radix UI Popover, hover tooltips on all charts. Styling: Professional business dashboard with Tailwind CSS, gradient fills on charts, smooth animations on data updates.",
                              image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
                            },
                            {
                              id: "data-viz-2",
                              title: "Weather Dashboard",
                              summary: "React weather viz: Recharts 7-day temp/precipitation charts, hourly forecast tooltips, UV gauge, dynamic gradient background",
                              prompt: "Build a React artifact. Context: Weather forecast visualization. Task: Create an interactive weather dashboard. Library: Recharts for all charts. Charts: 1) Area chart showing 7-day temperature forecast with min/max shading, 2) Bar chart for daily precipitation, 3) Radial gauge for UV index. Data: Mock weather data with hourly breakdowns. Interactions: Tooltip showing hourly forecast on hover, click day to see details. Visual Design: Gradient background that changes color based on conditions (sunny=yellow/orange, rainy=blue/gray, cloudy=gray), animated weather icons (lucide-react), beautiful card layout with Tailwind CSS.",
                              image: "https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=400&h=300&fit=crop"
                            },
                            {
                              id: "data-viz-3",
                              title: "Stock Portfolio",
                              summary: "React stock tracker: Recharts candlestick charts, allocation pie, multi-stock comparison, gain/loss indicators, animated counters",
                              prompt: "Build a React artifact. Context: Investment portfolio tracker. Task: Create a stock portfolio visualization. Library: Recharts for all charts. Charts: 1) Composed chart with candlestick-style visualization for price movements, 2) Pie chart showing portfolio allocation percentages, 3) Multi-line chart comparing performance of 3-5 stocks. Features: Mock real-time price updates (setInterval), gain/loss indicators with color coding (green=profit, red=loss), interactive legend to toggle stock visibility, animated number counters showing total value. UI: Radix UI Tabs to switch between charts. Styling: Financial theme with Tailwind CSS, stock ticker aesthetic.",
                              image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop"
                            },
                            {
                              id: "data-viz-4",
                              title: "Habit Tracker",
                              summary: "React habit tracker: D3 GitHub-style heat map calendar, Recharts radial progress, streak counter with fire emoji, stats cards",
                              prompt: "Build a React artifact. Context: Personal habit tracking. Task: Create a habit visualization dashboard. Libraries: D3 for heat map calendar, Recharts for other charts. Visualizations: 1) GitHub-style contribution heat map showing daily habit completion using D3 (365 days, darker=more habits completed), 2) Radial bar charts (Recharts) showing completion rate for each habit, 3) Bar chart showing weekly consistency trends. Features: Streak counter with fire emoji and animation when streak increases, habit checklist, completion celebration effects. Stats: Total completions, longest streak, current streak cards with animated count-ups. Styling: Motivational color scheme with Tailwind CSS.",
                              image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop"
                            },
                            {
                              id: "data-viz-5",
                              title: "Analytics Dashboard",
                              summary: "React web analytics: Recharts visitor traffic area, conversion funnel, device breakdown pie, sparkline trends, time filters",
                              prompt: "Build a React artifact. Context: Website analytics dashboard. Task: Create a comprehensive web analytics visualization. Library: Recharts for all charts. Charts: 1) Area chart for visitor traffic over time with real-time mock updates, 2) Funnel chart showing conversion rates (views→clicks→signups→purchases), 3) Pie chart for device breakdown (mobile/desktop/tablet), 4) Sparklines for engagement metrics (time on site, pages per session). Features: Bounce rate gauge, geographic heat map (simplified), time range filter tabs (today/week/month/year) with smooth transitions. Styling: Analytics dashboard aesthetic with Tailwind CSS, blue/purple color scheme, metric cards with trend arrows.",
                              image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"
                            },
                            // Games (5 options)
                            {
                              id: "game-1",
                              title: "Frogger Game",
                              summary: "React Frogger with HTML5 Canvas: arrow keys, traffic lanes, lily pads, collision detection, lives, progressive difficulty",
                              prompt: "Build a React artifact game. Context: Classic arcade Frogger remake. Rendering: HTML5 Canvas for game graphics. Controls: Arrow keys for movement (up/down/left/right). Game Mechanics: Player frog must cross traffic lanes with cars moving at different speeds, then hop across water on lily pads to reach goal. Collision: Hit by car = lose life, fall in water = lose life. Lives: 3 hearts displayed, game over when all lost. Scoring: Points for forward progress, bonus for speed. Progression: Each level increases car speed. Visual Style: Retro pixel art aesthetic with simple geometric shapes. UI: Lives counter, score display, level indicator, game over modal with restart button using Radix UI Dialog. State: React useState for game state.",
                              image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop"
                            },
                            {
                              id: "game-2",
                              title: "Snake Game",
                              summary: "React Snake game: WASD/arrow controls, food collection grows snake, collision detection, high score tracking, neon aesthetic",
                              prompt: "Build a React artifact game. Context: Classic Snake game. Rendering: HTML5 Canvas with 20x20 grid. Controls: WASD or arrow keys. Mechanics: Snake moves continuously, eating food (red square) grows body by one segment, collision with walls or self = game over. Scoring: 10 points per food, track high score in component state. Speed: Game speed increases every 5 foods eaten. Visual Design: Neon grid aesthetic with dark background, colorful gradient snake body (head=bright green fading to blue at tail), animated glow on food, particle effect when food eaten. UI: Score display, high score, pause button (spacebar). State: React useState for game state (no localStorage).",
                              image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop"
                            },
                            {
                              id: "game-3",
                              title: "Memory Match",
                              summary: "React memory game: Framer Motion flip animations, emoji cards, difficulty levels, move counter, timer, win celebration",
                              prompt: "Build a React artifact game. Context: Memory card matching game. Layout: 4x4 grid of cards (16 cards, 8 pairs). Content: Colorful emoji icons (🎨🎮🎵🎯🚀🌟💎🔥). Animations: Use Framer Motion for card flip effects (rotateY transform). Mechanics: Click to flip 2 cards, if match they stay revealed with celebration animation, if no match they flip back after 1 second delay. Difficulty: Radix UI Select to choose Easy (4x2 grid), Medium (4x4 grid), Hard (6x4 grid). Tracking: Move counter, elapsed timer. Win Condition: All pairs matched, show confetti celebration and stats (moves taken, time). Styling: Modern gradient card backs, smooth animations with Tailwind CSS.",
                              image: "https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&h=300&fit=crop"
                            },
                            {
                              id: "game-4",
                              title: "Trivia Quiz",
                              summary: "React trivia game: 10 questions, multiple choice, visual feedback (green/red), timer, lifelines (50/50, skip), results screen",
                              prompt: "Build a React artifact game. Context: Interactive trivia quiz. Questions: 10 multiple choice questions covering science, history, and entertainment. UI: Display question text, 4 answer buttons. Feedback: Correct answer turns green, wrong turns red, brief pause before next question. Scoring: Track correct answers, display percentage. Progress: Visual progress bar showing question number (1/10, 2/10, etc). Timer: 15 second countdown per question, auto-advance when time expires. Lifelines: 50/50 button (removes 2 wrong answers), Skip button (move to next question). Results: Final screen showing score, percentage, grade (A/B/C/D/F), share button. Styling: Game show aesthetic with Tailwind CSS, animated transitions.",
                              image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop"
                            },
                            {
                              id: "game-5",
                              title: "Tic Tac Toe AI",
                              summary: "React Tic Tac Toe: minimax AI opponent, difficulty selector, animated placement, win line highlight, multi-round scoring",
                              prompt: "Build a React artifact game. Context: Tic-tac-toe with AI opponent. Board: 3x3 grid. Players: User chooses X or O, AI takes the other. AI Logic: Implement minimax algorithm for unbeatable AI on 'Impossible' difficulty. Difficulty: Radix UI Select with Easy (random moves), Medium (mix of smart/random), Impossible (minimax). Animations: Scale effect on piece placement using Framer Motion, winning line highlight animation. Win Detection: Check rows, columns, diagonals, detect draws. Scoring: Track wins/losses/draws across multiple rounds displayed in score cards. UI: Reset button, difficulty selector, celebration confetti on player win. Styling: Modern board with gradient cells, smooth animations with Tailwind CSS.",
                              image: "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=400&h=300&fit=crop"
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
