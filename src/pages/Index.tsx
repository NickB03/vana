import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, LogOut, Settings, Check, ChevronRight, Palette, Plus, ImageIcon, WandSparkles, Send } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { ensureValidSession } from "@/utils/authHelpers";
import { PromptSuggestions } from "@/components/PromptSuggestions";
const IndexContent = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    themeMode,
    colorTheme,
    setThemeMode,
    setColorTheme
  } = useTheme();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [chatSendHandler, setChatSendHandler] = useState<((message?: string) => Promise<void>) | null>(null);
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
    window.history.pushState({
      showChat: true
    }, "", "/");
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
    // Automatically submit after setting the prompt
    setTimeout(() => {
      handleSubmit();
    }, 100);
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
      <SidebarInset>
        <main className="flex h-[100dvh] flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-background sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-background px-4" style={{
          paddingTop: 'var(--safe-area-inset-top)'
        }}>
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
                  {isAuthenticated ? <DropdownMenuItem onClick={handleLogout}>
                      <span>Sign Out</span>
                    </DropdownMenuItem> : <DropdownMenuItem onClick={() => navigate("/auth")}>
                      <span>Sign In</span>
                    </DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

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
                    className="w-full relative rounded-3xl border border-input bg-popover p-0 pt-1 shadow-xs"
                  >
                    <div className="flex flex-col">
                      <PromptInputTextarea
                        placeholder="Ask me anything..."
                        className="min-h-[44px] pl-4 pt-3 text-base leading-[1.3]"
                      />
                      <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                        {/* Left side actions */}
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-9 rounded-full"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingFile}
                              >
                                {isUploadingFile ? (
                                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Plus size={18} />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upload file</TooltipContent>
                          </Tooltip>

                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.svg,.csv,.json,.xlsx,.js,.ts,.tsx,.jsx,.py,.html,.css,.mp3,.wav,.m4a,.ogg"
                          />

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setInput("Generate an image of ")}>
                                <ImageIcon size={18} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate Image</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setInput("Help me create ")}>
                                <WandSparkles size={18} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-2">
                          <PromptInputAction tooltip="Send message">
                            <Button
                              type="submit"
                              size="icon"
                              disabled={isLoading || !input.trim()}
                              className="size-9 rounded-full bg-gradient-primary hover:opacity-90"
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

                  {/* Suggestion Cards - Below prompt */}
                  <div className="w-full max-w-3xl mx-auto px-4 pb-4">
                    <PromptSuggestions onSuggestionClick={handleSuggestionClick} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Interface Container - Takes remaining space with scroll */}
                <div className="flex-1 min-h-0 overflow-hidden">
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
                </div>

                {/* Persistent Prompt Input - Always visible at bottom */}
                <div className="z-10 shrink-0 bg-background px-3 pb-3 md:px-5 md:pb-5 safe-mobile-input" style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
                }}>
                  <div className="mx-auto max-w-3xl">
                    <PromptInput value={input} onValueChange={handleValueChange} isLoading={isLoading} onSubmit={handleSubmit} className="w-full relative rounded-3xl border border-input bg-popover p-0 pt-1 shadow-xs">
                      <div className="flex flex-col">
                        <PromptInputTextarea placeholder="Ask anything" className="min-h-[44px] pl-4 pt-3 text-base leading-[1.3] sm:text-base md:text-base" />
                        <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                          {/* Left side actions */}
                          <div className="flex items-center gap-2">
                            {/* Upload File Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile}>
                                  {isUploadingFile ? <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus size={18} />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Upload file</TooltipContent>
                            </Tooltip>

                            {/* Hidden file input */}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.svg,.csv,.json,.xlsx,.js,.ts,.tsx,.jsx,.py,.html,.css,.mp3,.wav,.m4a,.ogg" />

                            {/* Generate Image Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setInput("Generate an image of ")}>
                                  <ImageIcon size={18} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Generate Image</TooltipContent>
                            </Tooltip>

                            {/* Create Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={showChat ? handleCanvasToggle : () => setInput("Help me create ")}>
                                  <WandSparkles size={18} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{showChat ? isCanvasOpen ? "Hide canvas" : "Show canvas" : "Create"}</TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Right side - Send button */}
                          <PromptInputAction tooltip="Send message">
                            <Button
                              type="submit"
                              size="icon"
                              disabled={!input.trim() || isLoading}
                              className="size-9 rounded-full bg-gradient-primary hover:opacity-90"
                            >
                              {isLoading ? (
                                <Square className="size-5 fill-current" />
                              ) : (
                                <ArrowUp size={18} className="text-white" />
                              )}
                            </Button>
                          </PromptInputAction>
                        </PromptInputActions>
                      </div>
                    </PromptInput>
                  </div>
                </div>
              </>
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