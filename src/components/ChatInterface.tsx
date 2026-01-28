import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Maximize2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateFile, sanitizeFilename } from "@/utils/fileValidation";
import { ensureValidSession } from "@/utils/authHelpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHAT_SPACING, SAFE_AREA_SPACING, combineSpacing } from "@/utils/spacingConstants";
import {
  PromptInput,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import { useChatMessages, ChatMessage, type StreamProgress } from "@/hooks/useChatMessages";
import { useStreamCancellation } from "@/hooks/useStreamCancellation";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArtifactContainer as Artifact, ArtifactData } from "@/components/ArtifactContainer";
import { parseArtifacts, generateStableId } from "@/utils/artifactParser";
import { useIsMobile } from "@/hooks/use-mobile";
import { SystemMessage } from "@/components/ui/system-message";
import { RateLimitPopup } from "@/components/RateLimitPopup";
import { useNavigate } from "react-router-dom";
import { TOUR_STEP_IDS } from "@/components/tour";
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";
import { ERROR_IDS } from "@/constants/errorIds";
import { logError } from "@/utils/errorLogging";
import { getToolChoice, getModeHint } from "@/utils/toolChoice";
import { DevSkillIndicator } from "@/components/DevSkillIndicator";

interface ChatInterfaceProps {
  sessionId?: string;
  initialPrompt?: string;
  initialImageMode?: boolean;
  initialArtifactMode?: boolean;
  isCanvasOpen?: boolean;
  onCanvasToggle?: (isOpen: boolean) => void;
  onArtifactChange?: (hasContent: boolean) => void;
  input?: string;
  onInputChange?: (value: string) => void;
  onSendMessage?: (handleSend: (message?: string) => Promise<void>) => void;
  onInitialPromptSent?: () => void;
  isGuest?: boolean;
  guestMessageCount?: number;
  guestMaxMessages?: number;
  guestSession?: {
    saveMessages: (messages: ChatMessage[]) => void;
    loadMessages: () => ChatMessage[];
    clearMessages: () => void;
  };
}

export function ChatInterface({
  sessionId,
  initialPrompt,
  initialImageMode = false,
  initialArtifactMode = false,
  isCanvasOpen = false,
  onCanvasToggle,
  onArtifactChange,
  input: parentInput,
  onInputChange: parentOnInputChange,
  onSendMessage,
  onInitialPromptSent,
  isGuest = false,
  guestMessageCount = 0,
  guestMaxMessages = 10,
  guestSession
}: ChatInterfaceProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { messages, isLoading, streamChat, deleteMessage, updateMessage, addPlaceholderMessages, addPlaceholderAssistantMessageOnly, artifactRenderStatus, rateLimitPopup, setRateLimitPopup } = useChatMessages(sessionId, { isGuest, guestSession });
  const { cancelStream, startStream, completeStream } = useStreamCancellation();
  const [localInput, setLocalInput] = useState("");
  const input = typeof parentInput === 'string' ? parentInput : localInput;
  const setInput = parentOnInputChange ?? setLocalInput;
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Track elapsed time for the last streamed message (preserved after streaming ends)
  const [lastMessageElapsedTime, setLastMessageElapsedTime] = useState<string>("");
  const streamingStartTimeRef = useRef<number | null>(null);
  const elapsedTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamProgress, setStreamProgress] = useState<StreamProgress>({
    stage: "analyzing",
    message: "Analyzing request...",
    artifactDetected: false,
    percentage: 0,
    artifactInProgress: false,
    imageInProgress: false,
  });
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);
  const [artifactOverrides, setArtifactOverrides] = useState<Record<string, Partial<ArtifactData>>>({});
  const [isEditingArtifact, setIsEditingArtifact] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [imageMode, setImageMode] = useState(initialImageMode);
  const [artifactMode, setArtifactMode] = useState(initialArtifactMode);

  // Sync initialArtifactMode prop to state when it changes (for carousel clicks while mounted)
  // Only sync when prop is true to avoid interfering with reset logic after message send
  useEffect(() => {
    if (initialArtifactMode) {
      setArtifactMode(true);
    }
  }, [initialArtifactMode]);

  // Sync initialImageMode prop to state when it changes (for carousel clicks while mounted)
  useEffect(() => {
    if (initialImageMode) {
      setImageMode(true);
    }
  }, [initialImageMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  // Scroll state managed by VirtualizedMessageList via callbacks
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  // Ref to store handleSend for stable access in effects (prevents re-triggering initialPrompt effect)
  const handleSendRef = useRef<((message?: string) => Promise<void>) | null>(null);
  // Track which session+prompt combination has been initialized (using ref to avoid stale closure issues)
  const initializedSessionRef = useRef<string | null>(null);


  // Scroll state (isAtBottom, scrollToBottom) is now managed by VirtualizedMessageList
  // and communicated to ChatInterface via onAtBottomChange and onScrollToBottomChange callbacks
  // This enables unified scroll handling for both virtualized and artifact (spring-physics) paths

  // Memoized artifact open handler to prevent breaking memoization
  const handleArtifactOpen = useCallback((artifact: ArtifactData) => {
    setCurrentArtifact(artifact);
    if (onCanvasToggle) {
      onCanvasToggle(true);
    }
  }, [onCanvasToggle]);

  const handleArtifactUpdate = useCallback((artifactId: string, update: Partial<ArtifactData>) => {
    setArtifactOverrides(prev => ({
      ...prev,
      [artifactId]: {
        ...prev[artifactId],
        ...update
      }
    }));

    setCurrentArtifact(prev => (prev?.id === artifactId ? { ...prev, ...update } : prev));
  }, []);


  // Define handleSend early using useCallback to avoid initialization errors
  const handleSend = useCallback(async (message?: string) => {
    const messageToSend = message || input;

    if (typeof messageToSend !== 'string' || !messageToSend.trim() || isLoading || isStreaming) {
      return;
    }

    // CRITICAL FIX: Set UI feedback states IMMEDIATELY before any async operations
    // This ensures the reasoning ticker appears instantly, not after throttle wait
    setInput("");
    setIsStreaming(true);
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    setStreamingMessageId(assistantMessageId);
    // FIX (2026-01-28): Add BOTH user and assistant placeholder messages TOGETHER in correct order
    // This fixes two issues:
    // 1. Safari + production race condition where skeleton couldn't render (fixed 2026-01-27)
    // 2. Messages appearing out of order because assistant was added before user (fixed 2026-01-28)
    addPlaceholderMessages(userMessageId, messageToSend.trim(), assistantMessageId, sessionId || "guest");
    // Respect explicit modes: nudge the model towards tools when user opts in
    // If the user is editing an existing artifact, FORCE artifact tool (only exception)
    const isArtifactEdit = !!(currentArtifact && isEditingArtifact);
    const toolChoice = isArtifactEdit
      ? "generate_artifact"  // Only forced case: editing existing artifacts
      : getToolChoice(imageMode, artifactMode);  // Always returns 'auto' now
    const modeHint = getModeHint(imageMode, artifactMode);  // 'artifact', 'image', or 'auto'
    console.log("🎯 [ChatInterface.handleSend] Tool selection:", {
      imageMode,
      artifactMode,
      toolChoice,
      modeHint,
      isArtifactEdit,
    });
    // Initialize progress with "analyzing" state for immediate feedback
    // If an artifact is explicitly requested, show the artifact skeleton ASAP.
    setStreamProgress({
      stage: "analyzing",
      message: "Analyzing request...",
      artifactDetected: false,
      percentage: 0,
      artifactInProgress: toolChoice === "generate_artifact",
      imageInProgress: toolChoice === "generate_image",
      toolExecution: toolChoice === "generate_artifact" || toolChoice === "generate_image"
        ? { toolName: toolChoice, timestamp: Date.now() }
        : undefined,
    });
    // NOTE: setImageMode/setArtifactMode moved to useEffect below to prevent render phase updates

    // Start stream with cancellation support
    const abortController = startStream();

    // Increment tracker to trigger mode reset
    setMessageSentTracker(prev => prev + 1);

    try {
      await streamChat(
        messageToSend,
        (_chunk, progress) => {
          // Always update progress (includes reasoning steps)
          setStreamProgress((prev) => ({
            ...progress,
            toolExecution: progress.toolExecution ?? prev.toolExecution,
            streamingArtifact: progress.streamingArtifact ?? prev.streamingArtifact,
          }));
        },
        () => {
          setIsStreaming(false);
          setIsEditingArtifact(false);
          setStreamingMessageId(null);
          setStreamProgress((prevProgress) => ({
            ...prevProgress,
            stage: "complete" as const,
            message: "",
            percentage: 100,
            // Preserved automatically: reasoningSteps, streamingReasoningText, reasoningStatus, toolExecution, streamingArtifact
          }));
          completeStream();
        },
        currentArtifact && isEditingArtifact ? currentArtifact : undefined,
        toolChoice,
        modeHint,  // NEW: Pass mode hint to backend for prompt nudging
        0, // retryCount
        abortController.signal,
        assistantMessageId,
        userMessageId  // Pass pre-generated user message ID
      );
    } catch (streamError) {
      logError(streamError instanceof Error ? streamError : new Error(String(streamError)), {
        errorId: ERROR_IDS.STREAM_FAILED,
        sessionId,
        metadata: {
          toolChoice,
          messageLength: messageToSend.length,
          hasArtifact: !!(currentArtifact && isEditingArtifact),
        },
      });

      // Clean up streaming state
      setIsStreaming(false);
      setIsEditingArtifact(false);
      setStreamingMessageId(null);
      completeStream();

      // Inform user
      toast({
        title: "Message failed to send",
        description: streamError instanceof Error
          ? streamError.message
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [input, isLoading, isStreaming, setInput, streamChat, currentArtifact, isEditingArtifact, imageMode, artifactMode, startStream, completeStream, sessionId, addPlaceholderMessages]);

  // Keep ref updated with latest handleSend (for stable access in effects)
  handleSendRef.current = handleSend;

  // Track when messages are sent to reset image/artifact modes
  const [messageSentTracker, setMessageSentTracker] = useState(0);

  // Reset modes when a message is sent (moved from handleSend to prevent render phase updates)
  useEffect(() => {
    setImageMode(false);
    setArtifactMode(false);
  }, [messageSentTracker]);

  // Reset when session changes
  useEffect(() => {
    cancelStream();
    setIsStreaming(false);
    setStreamingMessageId(null);
    setCurrentArtifact(null);
    setIsEditingArtifact(false);
    setLastMessageElapsedTime("");
    setArtifactOverrides({});
    onArtifactChange?.(false);
    setMessageSentTracker(0); // Reset tracker
    setImageMode(false);
    setArtifactMode(false);
    // Note: initializedSessionRef is managed separately in the initialPrompt effect
    // onArtifactChange intentionally excluded - this effect should only run on session change,
    // not when the callback reference changes (which would cause unwanted stream cancellations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, cancelStream]);

  // Timer effect: Start timer when streaming begins, capture final time when streaming ends
  useEffect(() => {
    if (isStreaming) {
      // Start streaming - begin timing
      streamingStartTimeRef.current = Date.now();
      setLastMessageElapsedTime(""); // Reset for new stream

      // Update elapsed time every second
      elapsedTimeIntervalRef.current = setInterval(() => {
        if (streamingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - streamingStartTimeRef.current) / 1000);
          if (elapsed < 60) {
            setLastMessageElapsedTime(`${elapsed}s`);
          } else {
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            setLastMessageElapsedTime(`${minutes}m ${seconds}s`);
          }
        }
      }, 1000);
    } else {
      // Streaming ended - stop timer but KEEP the final elapsed time
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
      // Don't reset lastMessageElapsedTime - keep it for display
      streamingStartTimeRef.current = null;
    }

    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  // Expose handleSend to parent component
  useEffect(() => {
    if (onSendMessage) {
      onSendMessage(handleSend);
    }
  }, [onSendMessage, handleSend]);

  useEffect(() => {
    // Allow auto-send for both authenticated (with sessionId) AND guests (without sessionId)
    // Uses handleSendRef to avoid dependency on handleSend (which changes on every render cycle)
    // Uses initializedSessionRef to track which session has been initialized (ref avoids stale state issues)
    if (!initialPrompt || !handleSendRef.current) {
      return;
    }

    // Create a unique key for this session+prompt combination
    const initKey = `${sessionId || 'guest'}:${initialPrompt}`;

    // Skip if we've already initialized this exact session+prompt
    if (initializedSessionRef.current === initKey) {
      return;
    }

    // Mark as initialized BEFORE sending to prevent re-entry
    initializedSessionRef.current = initKey;

    // Send the initial prompt
    handleSendRef.current(initialPrompt);

    // Notify parent that initial prompt has been sent
    onInitialPromptSent?.();
  }, [sessionId, initialPrompt, onInitialPromptSent]);

  // Parse artifacts from messages (removed auto-open behavior)
  useEffect(() => {
    // Get the last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistantMsg) {
      parseArtifacts(lastAssistantMsg.content).then(({ artifacts }) => {
        if (artifacts.length > 0) {
          // Set artifact but don't auto-open canvas
          // User will click "Open" button on artifact card to open
          onArtifactChange?.(true);
        } else {
          onArtifactChange?.(false);
        }
      });
    } else {
      onArtifactChange?.(false);
    }
  }, [messages, onArtifactChange, sessionId]);

  // P0.2: Reconcile artifact ID mismatches between streaming and saved artifacts
  // After P0.1, IDs should match, but this is a safety fallback for timing differences
  useEffect(() => {
    if (!currentArtifact) return;

    // Parse artifacts from all saved messages to find matching artifact with different ID
    const parseAllArtifacts = async () => {
      const allArtifacts: ArtifactData[] = [];

      for (const message of messages) {
        if (message.role === "assistant") {
          const { artifacts } = await parseArtifacts(message.content);
          allArtifacts.push(...artifacts);
        }
      }

      // Find artifact with matching content/type/title but different ID
      const matchingArtifact = allArtifacts.find(a =>
        a.content === currentArtifact.content &&
        a.type === currentArtifact.type &&
        a.title === currentArtifact.title &&
        a.id !== currentArtifact.id
      );

      if (matchingArtifact) {
        console.log('[ChatInterface] Reconciling artifact IDs:', {
          from: currentArtifact.id,
          to: matchingArtifact.id
        });
        setCurrentArtifact(matchingArtifact);

        // Migrate override state from old ID to new ID
        setArtifactOverrides(prev => {
          const oldOverride = prev[currentArtifact.id];
          if (!oldOverride) return prev;

          const { [currentArtifact.id]: _, ...rest } = prev;
          return {
            ...rest,
            [matchingArtifact.id]: oldOverride
          };
        });
      }
    };

    parseAllArtifacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, currentArtifact?.id, currentArtifact?.content]);

  // Auto-open canvas when streaming artifact arrives
  // This provides immediate feedback like ChatGPT/Gemini/Claude - artifact opens in canvas
  // instead of raw XML appearing in chat
  // CRITICAL: Use ref to track last opened artifact to prevent infinite re-render loops
  const lastOpenedArtifactRef = useRef<string | null>(null);

  useEffect(() => {
    const streamingArtifact = streamProgress.streamingArtifact;
    if (!streamingArtifact) return;

    // Create stable ID from artifact content to detect duplicates
    const artifactId = `${streamingArtifact.type}-${streamingArtifact.title}-${streamingArtifact.code.length}`;

    // Skip if we've already opened this exact artifact (prevents infinite loops)
    if (lastOpenedArtifactRef.current === artifactId) {
      return;
    }

    lastOpenedArtifactRef.current = artifactId;

    // Map artifact type string to ArtifactType
    const mapArtifactType = (type: string): ArtifactData['type'] => {
      switch (type) {
        case 'react': return 'react';
        case 'code': return 'code';
        case 'html': return 'html';
        case 'svg': return 'svg';
        case 'mermaid': return 'mermaid';
        case 'markdown': return 'markdown';
        case 'image': return 'image';
        default: return 'react'; // Default to react for unknown types
      }
    };

    // P0.1 FIX: Generate deterministic hash-based ID that matches artifactParser.ts
    // This ensures streaming artifact ID matches the ID generated when message saves
    const createArtifactWithStableId = async () => {
      const cleanCode = streamingArtifact.code;
      const mappedType = mapArtifactType(streamingArtifact.type);

      // Generate the same ID that parseArtifacts() will create (index 0 for first artifact)
      const stableId = await generateStableId(cleanCode, mappedType, 0);

      // Create ArtifactData with deterministic ID
      const artifactData: ArtifactData = {
        id: stableId,
        type: mappedType,
        title: streamingArtifact.title,
        content: cleanCode,
      };

      console.log('[ChatInterface] P0.1 Streaming artifact received with stable ID:', {
        id: stableId,
        type: streamingArtifact.type,
        title: streamingArtifact.title,
        codeLength: cleanCode.length,
      });

      // Set as current artifact and open canvas
      setCurrentArtifact(artifactData);
      onCanvasToggle?.(true);
      onArtifactChange?.(true);
    };

    // Execute async ID generation
    createArtifactWithStableId();
  }, [streamProgress.streamingArtifact, onCanvasToggle, onArtifactChange]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setInput(`${input}\n[${file.name}](${signedUrlData.signedUrl})`);

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
  };

  const handleCreateClick = () => {
    if (!currentArtifact) {
      // No artifact exists - insert "Help me create" into prompt
      setInput("Help me create ");
    } else if (isCanvasOpen) {
      // Canvas is open - close it
      onCanvasToggle?.(false);
    } else {
      // Canvas exists but closed - open it
      onCanvasToggle?.(true);
    }
  };

  const handleEditArtifact = (suggestion?: string) => {
    setIsEditingArtifact(true);
    if (suggestion) {
      setInput(suggestion);
    }
    // Focus will naturally go to input
  };
  const handleCloseCanvas = () => {
    onCanvasToggle?.(false);
  };

  // Message action handlers
  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied to clipboard" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        errorId: ERROR_IDS.CLIPBOARD_COPY_FAILED,
        sessionId,
        metadata: {
          contentLength: content.length,
          isSecureContext: window.isSecureContext,
          hasClipboardAPI: !!navigator.clipboard,
        },
      });

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      let userMessage = "Failed to copy to clipboard";

      if (errorMessage.includes("permission")) {
        userMessage = "Clipboard access denied. Please allow clipboard permissions or select text manually.";
      } else if (!navigator.clipboard) {
        userMessage = "Clipboard not supported. Please select and copy text manually.";
      } else if (!window.isSecureContext) {
        userMessage = "Clipboard requires HTTPS. Please select and copy text manually.";
      }

      toast({
        title: "Copy failed",
        description: userMessage,
        variant: "destructive"
      });
    }
  }, [sessionId]);

  const handleRetry = useCallback(async (messageId: string) => {
    if (isLoading || isStreaming) {
      return;
    }

    // Find the message to retry and the user message before it
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) {
      toast({
        title: "Cannot retry",
        description: "No previous message found",
        variant: "destructive"
      });
      return;
    }

    // Get the failed assistant message and the user message before it
    const failedMessage = messages[messageIndex];
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== "user") {
      toast({
        title: "Cannot retry",
        description: "Previous message is not a user message",
        variant: "destructive"
      });
      return;
    }

    try {
      // Delete the assistant message
      await deleteMessage(messageId);

      // Regenerate the response by resending the user message
      setIsStreaming(true);
      const assistantMessageId = crypto.randomUUID();
      setStreamingMessageId(assistantMessageId);
      // Add assistant placeholder SYNCHRONOUSLY for immediate skeleton rendering
      // (User message already exists - this is a retry flow)
      addPlaceholderAssistantMessageOnly(assistantMessageId, sessionId || "guest");

      // Start stream with cancellation support
      const abortController = startStream();

      await streamChat(
        userMessage.content,
        (_chunk, progress) => {
          setStreamProgress(progress);
        },
        () => {
          setIsStreaming(false);
          setStreamingMessageId(null);
          setStreamProgress((prevProgress) => {
            const finalProgress = {
              ...prevProgress,
              stage: "complete" as const,
              message: "",
              artifactDetected: false,
              percentage: 100
            };
            return finalProgress;
          });
          completeStream();
        },
        currentArtifact && isEditingArtifact ? currentArtifact : undefined,
        "auto", // toolChoice
        "auto", // modeHint - let model decide for retries
        0, // retryCount
        abortController.signal,
        assistantMessageId
      );

      toast({
        title: "Regenerating response",
        description: "Creating a new response to your message"
      });
    } catch (error) {
      setIsStreaming(false);
      setStreamingMessageId(null);
      completeStream();

      logError(error instanceof Error ? error : new Error(String(error)), {
        errorId: ERROR_IDS.MESSAGE_RETRY_FAILED,
        sessionId,
        metadata: {
          messageId,
          userMessageContent: userMessage.content,
          failedMessageContent: failedMessage.content,
        },
      });

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to retry",
        description: `Could not regenerate response: ${errorMessage}`,
        variant: "destructive"
      });
    }
  }, [messages, isLoading, isStreaming, deleteMessage, streamChat, currentArtifact, isEditingArtifact, startStream, completeStream, sessionId]);

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setInput(content);
    toast({
      title: "Editing message",
      description: "Make your changes and press Enter to update"
    });
  }, [setInput]);


  // Render chat content (messages + input) - reusable for both mobile and desktop
  // Mobile-first padding: minimal on mobile for max text width, comfortable on desktop
  const renderChatContent = () => (
    <div className="flex flex-1 flex-col min-h-0 px-1 pt-1 pb-1 md:px-4 md:pt-4 md:pb-4">
      {/* Guest mode banner - only show when 3 or fewer messages remaining */}
      {isGuest && messages.length > 0 && (guestMaxMessages - guestMessageCount) <= 3 && (
        <div className="mx-auto w-full max-w-3xl mb-3">
          <SystemMessage
            variant="action"
            fill
            cta={{
              label: "Sign In",
              onClick: () => navigate("/auth")
            }}
            className="text-xs py-1.5 pr-1.5 pl-2.5"
          >
            {guestMessageCount < guestMaxMessages ? (
              <><strong>{guestMaxMessages - guestMessageCount}</strong> free message{guestMaxMessages - guestMessageCount !== 1 ? 's' : ''} left. Sign in for more!</>
            ) : (
              <>Free limit reached. Sign in to continue!</>
            )}
          </SystemMessage>
        </div>
      )}

      {/* Chat content - transparent to show unified parent container */}
      <div className="relative flex flex-1 min-h-0 w-full">
        {/* Virtualized message list with built-in scroll container */}
        {/* Replaces ChatContainerRoot/ChatContainerContent for 90%+ DOM node reduction */}
        <div className="flex flex-1 flex-col min-h-0 relative">
          <VirtualizedMessageList
            messages={messages}
            isStreaming={isStreaming}
            isLoading={isLoading}
            lastMessageElapsedTime={lastMessageElapsedTime}
            onRetry={handleRetry}
            onCopy={handleCopyMessage}
            onEdit={handleEditMessage}
            onArtifactOpen={handleArtifactOpen}
            onArtifactUpdate={handleArtifactUpdate}
            artifactOverrides={artifactOverrides}
            streamProgress={streamProgress}
            artifactRenderStatus={artifactRenderStatus}
            streamingMessageId={streamingMessageId}
            className="flex-1 min-h-0"
            scrollRef={messageListRef}
            onAtBottomChange={setIsAtBottom}
            onScrollToBottomChange={(fn) => { scrollToBottomRef.current = fn; }}
          />

          <div className={cn(
            "absolute bottom-32 left-1/2 -translate-x-1/2 z-10",
            isAtBottom && "pointer-events-none"
          )}>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "rounded-full transition-all duration-150 ease-out shadow-sm",
                isAtBottom
                  ? "pointer-events-none translate-y-4 scale-95 opacity-0"
                  : "translate-y-0 scale-100 opacity-100"
              )}
              onClick={() => {
                // Use unified scrollToBottom from VirtualizedMessageList
                // This handles both virtualized (manual) and artifact (spring-physics) paths
                scrollToBottomRef.current?.();
              }}
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Prompt Input - embedded within chat card */}
          {/* Mobile-first padding: px-3 pb-3 on mobile, px-4 pb-4 on desktop */}
          {/* SAFE_AREA_SPACING.bottom provides the safe-area padding, cn() resolves conflicts */}
          <div className={combineSpacing("shrink-0 bg-transparent safe-mobile-input", CHAT_SPACING.input.container, SAFE_AREA_SPACING.bottom)}>
            <div className="mx-auto w-full max-w-3xl">
              <PromptInput
                id={TOUR_STEP_IDS.CHAT_INPUT}
                value={input}
                onValueChange={setInput}
                isLoading={isLoading || isStreaming}
                onSubmit={handleSend}
                className="w-full relative rounded-xl bg-black p-0 pt-1"
              >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder="Ask anything"
                  className={combineSpacing("min-h-[44px] text-base leading-[1.3]", CHAT_SPACING.input.textarea)}
                />
                <PromptInputControls
                  className="mt-2 px-3 pb-2"
                  imageMode={imageMode}
                  onImageModeChange={setImageMode}
                  artifactMode={artifactMode}
                  onArtifactModeChange={setArtifactMode}
                  isCanvasOpen={isCanvasOpen}
                  currentArtifact={currentArtifact}
                  onCreateClick={handleCreateClick}
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  input={input}
                  onSend={() => handleSend()}
                  onStop={cancelStream}
                  showFileUpload={true}
                  fileInputRef={fileInputRef}
                  isUploadingFile={isUploadingFile}
                  onFileUpload={handleFileUpload}
                  sendIcon="right"
                />
              </div>
            </PromptInput>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <RateLimitPopup
        isOpen={rateLimitPopup.isOpen}
        resetAt={rateLimitPopup.resetAt}
        onSignIn={() => navigate("/auth")}
        onDismiss={() => setRateLimitPopup({ isOpen: false, resetAt: undefined })}
      />
      {/* Dev-only skill activation indicator */}
      <DevSkillIndicator progress={streamProgress} />
      <div className="flex flex-1 flex-col min-h-0">
        {isMobile ? (
          // Mobile Layout: Fullscreen artifact overlay or chat
          // Glass effect background - edge to edge
          <div className={cn(
            "flex flex-col flex-1 min-h-0 overflow-hidden",
            "bg-black/40 backdrop-blur-md"
          )}>
            {/* Mobile: Chat content is always rendered */}
            {renderChatContent()}

            {/* Mobile: Floating button to open artifact (when artifact exists but canvas is closed) */}
            {currentArtifact && !isCanvasOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 hover:brightness-110 hover:-translate-y-0.5 transition-all"
                    style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
                    onClick={() => onCanvasToggle?.(true)}
                  >
                    <Maximize2 className="h-6 w-6 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Artifact</TooltipContent>
              </Tooltip>
            )}

            {/* Mobile: Fullscreen artifact overlay with enter/exit animation */}
            <AnimatePresence>
              {isCanvasOpen && currentArtifact && (
                <motion.div
                  key="mobile-artifact"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="fixed inset-0 z-50 bg-background"
                >
                  <Artifact
                    artifact={currentArtifact}
                    onClose={handleCloseCanvas}
                    onEdit={handleEditArtifact}
                    onContentChange={(newContent) => {
                      setCurrentArtifact({ ...currentArtifact, content: newContent });
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // Desktop Layout: Side-by-side resizable panels with Gemini-style sizing (30/70 split)
          // Glass effect background - edge to edge (no margins)
          <div className={cn(
            "flex-1 min-h-0 overflow-hidden",
            "bg-black/60 backdrop-blur-md shadow-2xl"
          )}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel
                id="chat-panel"
                order={1}
                defaultSize={isCanvasOpen && currentArtifact ? 30 : 100}
                minSize={20}
                maxSize={isCanvasOpen && currentArtifact ? 50 : 100}
                className="md:min-w-[280px] flex flex-col"
              >
                {renderChatContent()}
              </ResizablePanel>

              <ResizableHandle
                withHandle
                className={`hidden md:flex ${!isCanvasOpen || !currentArtifact ? 'invisible' : ''}`}
              />
              <ResizablePanel
                id="canvas-panel"
                order={2}
                defaultSize={isCanvasOpen && currentArtifact ? 70 : 0}
                minSize={isCanvasOpen && currentArtifact ? 50 : 0}
                className={cn(
                  "md:min-w-[400px] flex flex-col",
                  // Hide panel when canvas is closed OR no artifact exists
                  // This triggers ResizablePanelGroup to redistribute space to chat panel
                  (!isCanvasOpen || !currentArtifact) && "hidden"
                )}
              >
                {/* Desktop artifact with scale-in animation on open */}
                {currentArtifact && (
                  <motion.div
                    key={currentArtifact.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full"
                  >
                    <Artifact
                      artifact={currentArtifact}
                      onClose={handleCloseCanvas}
                      onEdit={handleEditArtifact}
                      onContentChange={(newContent) => {
                        setCurrentArtifact({ ...currentArtifact, content: newContent });
                      }}
                    />
                  </motion.div>
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </>
  );
}
