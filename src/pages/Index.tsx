import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from "sonner";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureValidSession } from "@/utils/authHelpers";
import GalleryHoverCarousel from "@/components/ui/gallery-hover-carousel";
const IndexContent = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    sessions,
    isLoading: sessionsLoading,
    createSession,
    deleteSession
  } = useChatSessions();
  const {
    setOpen
  } = useSidebar();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [chatSendHandler, setChatSendHandler] = useState<((message?: string) => Promise<void>) | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session && event !== 'INITIAL_SESSION') {
        navigate("/auth");
      }
    });

    // Optimized session validation - check only when necessary
    // Check 5 minutes before token expiry instead of polling every 5 minutes
    let timeoutId: NodeJS.Timeout;
    const scheduleSessionCheck = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000; // Convert to ms
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const checkTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // Check 5 min before expiry

        timeoutId = setTimeout(async () => {
          const validSession = await ensureValidSession();
          if (!validSession) {
            setIsAuthenticated(false);
            toast({
              title: "Session Expired",
              description: "Please sign in again to continue",
              variant: "destructive"
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
  const handleCanvasToggle = (forceState?: boolean) => {
    const newCanvasState = forceState !== undefined ? forceState : !isCanvasOpen;
    setIsCanvasOpen(newCanvasState);

    // Auto-close sidebar when opening canvas to save space (like Gemini)
    // Auto-restore sidebar when closing canvas
    // Only toggle sidebar if artifact exists
    if (hasArtifact) {
      setOpen(!newCanvasState);
    }
  };
  const handleArtifactChange = (hasContent: boolean) => {
    setHasArtifact(hasContent);
    if (!hasContent) {
      setIsCanvasOpen(false);
    }
    // Don't auto-open canvas - user will click "Open" button on artifact card
  };
  const handleSessionSelect = (sessionId: string) => {
    setInput(""); // Clear input when switching sessions
    setCurrentSessionId(sessionId);
    setShowChat(true);
    // Push state for browser back button
    window.history.pushState({
      showChat: true
    }, "", "/");
  };
  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (showChat && chatSendHandler) {
      // In chat mode - call the ChatInterface's send handler
      await chatSendHandler(input);
      setInput("");
      return;
    }

    // Homepage mode - create new session
    // Validate session before creating chat
    const session = await ensureValidSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please refresh the page or sign in again",
        variant: "destructive"
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
      window.history.pushState({
        showChat: true
      }, "", "/");
    }
    setIsLoading(false);
  };
  const handleValueChange = (value: string) => {
    setInput(value);
  };
  
  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    // Don't auto-submit - let the user review and click send
    // This ensures the input state is properly updated and the send button becomes enabled
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      // Validate file with comprehensive checks
      const validationResult = await validateFile(file);
      if (!validationResult.valid) {
        sonnerToast.error(validationResult.error || "File validation failed");
        return;
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        sonnerToast.error("You must be logged in to upload files");
        return;
      }

      // Sanitize filename and create upload path
      const sanitized = sanitizeFilename(file.name);
      const fileExt = sanitized.substring(sanitized.lastIndexOf('.'));
      const fileName = `${user.id}/${Date.now()}${fileExt}`;

      // Upload to Supabase storage
      const {
        error: uploadError
      } = await supabase.storage.from('user-uploads').upload(fileName, file, {
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
      sonnerToast.success("File uploaded successfully");
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
        sonnerToast.error(`Upload succeeded but URL generation failed: ${errorMessage}`);
      } else if (errorMessage.includes('File too large')) {
        sonnerToast.error('File is too large. Maximum size is 100MB.');
      } else if (errorMessage.includes('Invalid file type')) {
        sonnerToast.error('Invalid file type. Supported types: images, documents, text files.');
      } else {
        sonnerToast.error(`Failed to upload file: ${errorMessage}`);
      }
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  return <>
      <ChatSidebar sessions={sessions} currentSessionId={currentSessionId} onSessionSelect={handleSessionSelect} onNewChat={handleNewChat} onDeleteSession={deleteSession} isLoading={sessionsLoading} />
      <SidebarInset className="relative bg-background">
        <main className="flex h-[100dvh] flex-col overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!showChat ? (
              <div className="flex h-full flex-col items-center justify-between overflow-y-auto p-4 sm:p-8 pt-safe pb-safe">
                {/* Top spacer */}
                <div></div>

                {/* Centered heading */}
                <div className="text-center w-full">
                  <h1 className="bg-gradient-primary bg-clip-text text-3xl sm:text-4xl md:text-5xl font-bold text-transparent mb-4">
                    Hi, I'm Vana.
                  </h1>
                  <p className="text-foreground/80 text-sm sm:text-base">
                    Get started by choosing from an idea below or tell me what you want to do in chat
                  </p>
                </div>

                {/* Bottom section with prompt and suggestions */}
                <div className="w-full">
                  {/* Prompt Box */}
                  <div className="w-full max-w-3xl mx-auto mb-6 px-4">
                  <PromptInput
                    value={input}
                    onValueChange={handleValueChange}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                    className="w-full relative rounded-xl bg-black/50 backdrop-blur-sm p-0 pt-1"
                  >
                    <div className="flex flex-col">
                      <PromptInputTextarea
                        placeholder="Ask anything"
                        className="min-h-[44px] text-base leading-[1.3] pl-4 pt-3"
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
                        showFileUpload={true}
                        fileInputRef={fileInputRef}
                        isUploadingFile={isUploadingFile}
                        onFileUpload={handleFileUpload}
                        sendIcon="send"
                      />
                    </div>
                  </PromptInput>
                </div>

                  {/* Suggestion Carousel - Below prompt */}
                  <div className="w-full max-w-5xl mx-auto pb-4">
                    <GalleryHoverCarousel
                      heading=""
                      className="py-0 bg-transparent"
                      onItemClick={(item) => handleSuggestionClick(item.prompt || item.summary)}
                      items={[
                        // Image Generation
                        {
                          id: "img-gen-1",
                          title: "Generate an Image",
                          summary: "Generate an image of Pikachu in a banana costume",
                          prompt: "Generate an image of Pikachu in a banana costume",
                          image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop"
                        },
                        {
                          id: "img-gen-2",
                          title: "Create Artwork",
                          summary: "Generate a cyberpunk cityscape at sunset with flying cars",
                          prompt: "Generate a cyberpunk cityscape at sunset with flying cars",
                          image: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&h=300&fit=crop"
                        },
                        {
                          id: "img-gen-3",
                          title: "Fantasy Character",
                          summary: "Generate an image of a mystical elf warrior with glowing armor in an enchanted forest",
                          prompt: "Generate an image of a mystical elf warrior with glowing armor in an enchanted forest",
                          image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop"
                        },
                        // Web Apps
                        {
                          id: "web-app-1",
                          title: "Todo List App",
                          summary: "Create an interactive todo list with categories, priorities, and deadlines",
                          prompt: "Create an interactive todo list with categories, priorities, and deadlines",
                          image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop"
                        },
                        {
                          id: "web-app-2",
                          title: "Shopping List",
                          summary: "Create a smart shopping list app with item categorization and price tracking",
                          prompt: "Create a smart shopping list app with item categorization and price tracking",
                          image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop"
                        },
                        {
                          id: "web-app-3",
                          title: "Budget Tracker",
                          summary: "Build a personal budget tracker with expense categories and spending insights",
                          prompt: "Build a personal budget tracker with expense categories and spending insights",
                          image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop"
                        },
                        {
                          id: "web-app-4",
                          title: "Recipe Manager",
                          summary: "Create a recipe management app with ingredients list and cooking timer",
                          prompt: "Create a recipe management app with ingredients list and cooking timer",
                          image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop"
                        },
                        // Data Visualization
                        {
                          id: "data-viz-1",
                          title: "Sales Dashboard",
                          summary: "Create an interactive sales dashboard with revenue trends and customer analytics",
                          prompt: "Create an interactive sales dashboard with revenue trends and customer analytics",
                          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
                        },
                        {
                          id: "data-viz-2",
                          title: "Habit Tracker",
                          summary: "Build a habit tracking dashboard with streaks visualization and progress stats",
                          prompt: "Build a habit tracking dashboard with streaks visualization and progress stats",
                          image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=300&fit=crop"
                        },
                        {
                          id: "data-viz-3",
                          title: "Weather Viz",
                          summary: "Build an interactive weather visualization showing temperature and precipitation patterns",
                          prompt: "Build an interactive weather visualization showing temperature and precipitation patterns",
                          image: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&h=300&fit=crop"
                        },
                        // Games
                        {
                          id: "game-1",
                          title: "Build a Game",
                          summary: "Build a web-based Frogger game with arrow key controls",
                          prompt: "Build a web-based Frogger game with arrow key controls",
                          image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop"
                        },
                        {
                          id: "game-2",
                          title: "Memory Card Game",
                          summary: "Build a memory matching card game with different difficulty levels",
                          prompt: "Build a memory matching card game with different difficulty levels",
                          image: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400&h=300&fit=crop"
                        },
                        {
                          id: "game-3",
                          title: "Snake Game",
                          summary: "Create a classic snake game with score tracking and increasing difficulty",
                          prompt: "Create a classic snake game with score tracking and increasing difficulty",
                          image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop"
                        },
                        // Tools & Calculators
                        {
                          id: "tool-1",
                          title: "Mortgage Calculator",
                          summary: "Build a mortgage calculator with amortization schedule and payment breakdown",
                          prompt: "Build a mortgage calculator with amortization schedule and payment breakdown",
                          image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop"
                        },
                        {
                          id: "tool-2",
                          title: "Unit Converter",
                          summary: "Build a comprehensive unit converter for length, weight, temperature, and currency",
                          prompt: "Build a comprehensive unit converter for length, weight, temperature, and currency",
                          image: "https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?w=400&h=300&fit=crop"
                        },
                        {
                          id: "tool-3",
                          title: "Pomodoro Timer",
                          summary: "Build a Pomodoro productivity timer with work/break intervals and statistics",
                          prompt: "Build a Pomodoro productivity timer with work/break intervals and statistics",
                          image: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=400&h=300&fit=crop"
                        },
                        // Creative
                        {
                          id: "creative-1",
                          title: "Color Palette",
                          summary: "Build a color palette generator with hex codes and complementary colors",
                          prompt: "Build a color palette generator with hex codes and complementary colors",
                          image: "https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=300&fit=crop"
                        },
                        {
                          id: "creative-2",
                          title: "Music Player",
                          summary: "Create an interactive music player interface with playlist management",
                          prompt: "Create an interactive music player interface with playlist management",
                          image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop"
                        }
                      ]}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <ChatInterface
                sessionId={currentSessionId}
                initialPrompt={input}
                isCanvasOpen={isCanvasOpen}
                onCanvasToggle={handleCanvasToggle}
                onArtifactChange={handleArtifactChange}
                input={input}
                onInputChange={setInput}
                onSendMessage={handler => setChatSendHandler(() => handler)}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </>;
};
const Index = () => {
  return <SidebarProvider defaultOpen={true}>
      <IndexContent />
    </SidebarProvider>;
};
export default Index;