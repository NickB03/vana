import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { toast as sonnerToast } from "sonner";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { useChatSessions } from "@/hooks/useChatSessions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureValidSession } from "@/utils/authHelpers";
import { suggestions, type SuggestionItem } from "@/data/suggestions";
const IndexContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
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
  const [pendingInitialPrompt, setPendingInitialPrompt] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [hasArtifact, setHasArtifact] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [chatSendHandler, setChatSendHandler] = useState<((message?: string) => Promise<void>) | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive showChat from URL path instead of state
  const showChat = location.pathname.startsWith('/main') || location.pathname.startsWith('/chat');

  // Sync URL session ID with component state
  useEffect(() => {
    if (urlSessionId) {
      setCurrentSessionId(urlSessionId);
    }
  }, [urlSessionId]);

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
  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setInput("");
    setPendingInitialPrompt(undefined);
    setIsCanvasOpen(false);
    setHasArtifact(false);
    // Navigate to home page
    navigate("/");
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
    // Navigate to chat route with session ID
    navigate(`/chat/${sessionId}`);
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
    const promptToSend = input; // Capture before clearing
    const sessionId = await createSession(promptToSend);
    if (sessionId) {
      setCurrentSessionId(sessionId);
      // Set pending prompt and clear input to prevent auto-send bugs
      // ChatInterface receives pendingInitialPrompt on mount, which is cleared after use
      setPendingInitialPrompt(promptToSend);
      setInput(""); // Clear input so it doesn't persist
      // Navigate to chat route with session ID
      navigate(`/chat/${sessionId}`);
    }
    setIsLoading(false);
  };
  const handleValueChange = (value: string) => {
    setInput(value);
  };
  
  const handleSuggestionClick = (item: SuggestionItem) => {
    setInput(item.prompt || item.summary);
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
              <ChatLayout
                input={input}
                onInputChange={handleValueChange}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                suggestions={suggestions}
                loadingSuggestions={false}
                onSuggestionClick={handleSuggestionClick}
                fileInputRef={fileInputRef}
                isUploadingFile={isUploadingFile}
                onFileUpload={handleFileUpload}
                imageMode={imageMode}
                onImageModeChange={setImageMode}
                artifactMode={artifactMode}
                onArtifactModeChange={setArtifactMode}
                sendIcon="send"
              />
            ) : (
              <ChatInterface
                sessionId={currentSessionId}
                initialPrompt={pendingInitialPrompt}
                initialImageMode={imageMode}
                initialArtifactMode={artifactMode}
                isCanvasOpen={isCanvasOpen}
                onCanvasToggle={handleCanvasToggle}
                onArtifactChange={handleArtifactChange}
                input={input}
                onInputChange={setInput}
                onSendMessage={handler => {
                  setChatSendHandler(() => handler);
                  // Clear pending prompt after ChatInterface has consumed it
                  setPendingInitialPrompt(undefined);
                }}
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