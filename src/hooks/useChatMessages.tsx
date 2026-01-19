import { useCallback, useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/utils/authHelpers";
import { chatRequestThrottle } from "@/utils/requestThrottle";
import { ChatMessage } from "@/types/chat";
import { StructuredReasoning, parseReasoningSteps, ReasoningStep } from "@/types/reasoning";
import { WebSearchResults } from "@/types/webSearch";

// ChatMessage interface is now imported from @/types/chat to avoid circular dependencies

export type GenerationStage =
  | "analyzing"
  | "planning"
  | "generating"
  | "finalizing"
  | "complete";

export type ToolChoice = "auto" | "generate_artifact" | "generate_image";

export interface ToolExecution {
  toolName: string;
  arguments?: Record<string, unknown>;
  success?: boolean;
  sourceCount?: number;
  latencyMs?: number;
  timestamp: number;
}

export interface StreamProgress {
  stage: GenerationStage;
  message: string;
  artifactDetected: boolean;
  percentage: number;
  artifactInProgress?: boolean;
  imageInProgress?: boolean;
  reasoningSteps?: StructuredReasoning; // Structured reasoning for streaming
  streamingReasoningText?: string; // Raw reasoning text being streamed (GLM native thinking)
  reasoningStatus?: string; // Semantic status update from GLM-4.5-Air
  searchResults?: WebSearchResults; // Web search results for streaming
  toolExecution?: ToolExecution; // Tool execution status for real-time display
  // Artifact data collected during streaming for immediate display
  streamingArtifacts?: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    language?: string;
  }>;
}

export interface RateLimitHeaders {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds to wait (for 429 responses)
}

export interface UseChatMessagesOptions {
  onRateLimitUpdate?: (headers: RateLimitHeaders) => void;
  isGuest?: boolean; // Explicit guest mode flag - when true, messages are saved to local state only
  guestSession?: {
    saveMessages: (messages: ChatMessage[]) => void;
    loadMessages: () => ChatMessage[];
    clearMessages: () => void;
    sessionId?: string | null; // Guest session ID for API requests
  };
}

/**
 * Parse rate limit headers from HTTP response
 */
function parseRateLimitHeaders(headers: Headers): RateLimitHeaders | null {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  const retryAfter = headers.get("Retry-After");

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
    };
  }
  return null;
}

export function useChatMessages(
  sessionId: string | undefined,
  options?: UseChatMessagesOptions
) {
  const isGuest = options?.isGuest ?? false;
  const guestSession = options?.guestSession;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [artifactRenderStatus, setArtifactRenderStatus] = useState<'pending' | 'rendered' | 'error'>('pending');
  const [rateLimitPopup, setRateLimitPopup] = useState<{
    isOpen: boolean;
    resetAt?: string;
  }>({
    isOpen: false,
    resetAt: undefined,
  });
  const { toast } = useToast();

  // Phase 1: Stream session tracking to prevent race conditions
  const streamSessionRef = useRef(0);
  const currentSessionRef = useRef<number | null>(null);

  const fetchMessages = useCallback(async () => {
    // Skip database fetch for guests or when no sessionId
    // Guests use local state only (messages are in-memory for their session)
    if (isGuest || !sessionId) return;

    // Capture sessionId at call time to detect stale responses
    const currentSessionId = sessionId;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Guard: Only update if session hasn't changed during fetch
      if (currentSessionId !== sessionId) {
        console.log('[fetchMessages] Ignoring stale results for old session:', currentSessionId);
        return;
      }

      const typedData = (data || []).map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      }));

      setMessages(typedData);
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [sessionId, isGuest, toast]);

  useEffect(() => {
    if (sessionId) {
      setMessages([]); // Clear messages when session changes
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId, fetchMessages]);

  // Persist guest messages to localStorage after state updates (prevent setState-during-render warning)
  // This effect runs AFTER render phase, not during it
  // NOTE: guestSession is NOT in dependencies to prevent infinite re-render loop
  // (guestSession object reference changes on every parent render, causing effect re-run)
  // We only care about messages and isGuest changes, not guestSession reference stability
  useEffect(() => {
    if (isGuest && guestSession && messages.length > 0) {
      try {
        guestSession.saveMessages(messages);
        console.log(`[useChatMessages] Persisted ${messages.length} guest messages after render`);
      } catch (error) {
        console.error("Failed to persist guest messages after render:", error);
      }
    }
  }, [messages, isGuest]);

  // Listen for artifact render completion messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from our iframes (blob URLs report 'null') or same origin
      // Prevents malicious iframes or websites from sending fake artifact signals
      const validOrigins = ['null', window.location.origin];
      if (!validOrigins.includes(event.origin)) {
        // Silently ignore messages from untrusted origins
        return;
      }


      if (event.data?.type === 'artifact-rendered-complete') {
        if (event.data.success) {
          console.log('[useChatMessages] Artifact rendered successfully');
          setArtifactRenderStatus('rendered');
        } else {
          console.error('[useChatMessages] Artifact render failed:', event.data.error);
          setArtifactRenderStatus('error');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Timeout fallback: If artifact render signal isn't received within 10s after loading ends,
  // assume rendered. This prevents the "Rendering artifact..." spinner from getting stuck.
  // Phase 1: Check session validity to prevent race conditions
  useEffect(() => {
    // Only start timeout when we're NOT loading and status is still pending
    if (isLoading || artifactRenderStatus !== 'pending') return;

    const timeout = setTimeout(() => {
      // Validate that this timeout belongs to the current session
      if (artifactRenderStatus === 'pending' && !isLoading && currentSessionRef.current === streamSessionRef.current) {
        console.warn('[useChatMessages] Artifact render timeout - assuming success');
        setArtifactRenderStatus('rendered');
      }
    }, 10000); // 10 second timeout after loading completes

    return () => clearTimeout(timeout);
  }, [isLoading, artifactRenderStatus]);

  const saveMessage = async (
    role: "user" | "assistant",
    content: string,
    reasoning?: string,
    reasoningSteps?: StructuredReasoning,
    searchResults?: WebSearchResults,
    /** Pre-generated message ID (for linking artifacts saved in DB) */
    messageId?: string,
    /** Artifact IDs to associate with this message */
    artifactIds?: string[],
    /** Full artifact data for guest users (stored in localStorage, not DB) */
    artifacts?: Array<{ id: string; type: string; title: string; content: string; language?: string }>
  ) => {
    // Validate reasoning steps before saving - will return null if invalid
    // This prevents 400 errors from database constraint violations
    const validatedReasoningSteps = reasoningSteps
      ? parseReasoningSteps(reasoningSteps)
      : null;

    // parseReasoningSteps returns StructuredReasoning | null, never false
    // Log warning if validation failed (reasoningSteps provided but validation returned null)
    if (reasoningSteps && !validatedReasoningSteps) {
      console.warn("[saveMessage] Invalid reasoning steps, using null instead:", reasoningSteps);
    }

    // For guest users (explicit isGuest flag OR no sessionId), add message to local state only
    // This prevents 401 errors when guest sessions have a UUID for artifact bundling
    if (isGuest || !sessionId) {
      const guestMessage: ChatMessage = {
        id: messageId || crypto.randomUUID(), // Use pre-generated ID if provided
        session_id: sessionId || "guest", // Use provided sessionId for artifact bundling, or "guest" fallback
        role,
        content,
        reasoning: reasoning || null,
        reasoning_steps: validatedReasoningSteps, // FIX: Use validated reasoning steps
        search_results: searchResults || null,
        artifact_ids: artifactIds || null, // Include artifact IDs
        artifacts: artifacts || null, // Include full artifact data for localStorage persistence
        created_at: new Date().toISOString(),
      };

      // Update local state - don't persist during render phase
      setMessages((prev) => [...prev, guestMessage]);

      return guestMessage;
    }

    // For authenticated users, save to database
    try {
      const insertData: Record<string, unknown> = {
        session_id: sessionId,
        role,
        content,
        reasoning,
        reasoning_steps: validatedReasoningSteps,
        search_results: searchResults || null,
        artifact_ids: artifactIds || null,
      };

      // Use pre-generated ID if provided (for linking artifacts)
      if (messageId) {
        insertData.id = messageId;
      }

      // CRITICAL FIX: Use upsert instead of insert to handle message stubs created by backend
      // The backend creates a stub message during streaming to satisfy FK constraints for artifacts.
      // This upsert will UPDATE the stub with full content, or INSERT if no stub exists.
      const { data, error } = await supabase
        .from("chat_messages")
        .upsert(insertData, {
          onConflict: 'id', // Update existing message with same ID
        })
        .select()
        .single();

      if (error) {
        console.error("Database error saving message:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      const typedMessage: ChatMessage = {
        ...data,
        role: data.role as "user" | "assistant"
      };

      setMessages((prev) => [...prev, typedMessage]);
      return typedMessage;
    } catch (error: unknown) {
      console.error("Error saving message:", error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      });

      // BUG FIX: Still add message to local state even if DB save fails
      // This prevents blank screen when database is unavailable
      // The message won't persist but at least the user can see the response
      const tempMessage: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: sessionId || 'guest',
        role,
        content,
        reasoning: reasoning || null,
        reasoning_steps: validatedReasoningSteps,
        search_results: searchResults || null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
      return tempMessage;
    }
  };

  const streamChat = async (
    userMessage: string,
    onDelta: (chunk: string, progress: StreamProgress) => void,
    onDone: () => void,
    currentArtifact?: { title: string; type: string; content: string },
    toolChoice: ToolChoice = "auto",
    retryCount = 0,
    abortSignal?: AbortSignal
  ) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [2000, 5000, 10000]; // Exponential backoff: 2s, 5s, 10s

    // Phase 1: Increment stream session and store ID for cleanup checks
    const streamSessionId = ++streamSessionRef.current;
    currentSessionRef.current = streamSessionId;

    // Phase 1: Set artifact render status immediately
    // Note: Caller should have already set isStreaming for instant UI feedback
    setArtifactRenderStatus('pending');

    let fullResponse = "";
    let tokenCount = 0;
    let artifactDetected = false;
    // Pre-generate assistant message ID for artifact DB linking
    const assistantMessageId = crypto.randomUUID();
    // Track artifact IDs collected during streaming
    const collectedArtifactIds: string[] = [];
    // Track full artifact data for immediate streaming display (not just IDs)
    const collectedArtifacts: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      language?: string;
    }> = [];

    try {
      // Client-side throttling: silently wait for token (protects API from burst requests)
      // NOTE: Caller has already set isStreaming=true, so UI shows feedback during this wait
      await chatRequestThrottle.waitForToken();

      // Phase 1: Set isLoading after throttle completes
      setIsLoading(true);

      // Get session for access token (but trust isGuest prop as source of truth)
      // Note: getSession() returns cached data and may be stale - don't use it to determine guest status
      const { data: { session } } = await supabase.auth.getSession();

      // BUG FIX: Use the hook's isGuest prop (passed from Home.tsx) as source of truth
      // Previously used !session which could be stale/invalid, causing auth mismatch errors
      const isAuthenticated = !isGuest && !!session;

      // Log auth state for debugging session mismatches
      if (!isGuest && !session) {
        console.warn("[useChatMessages] Auth mismatch: isGuest=false but no session found");
      }

      // Save user message ONLY on first attempt (not on retries to avoid duplicates)
      if (retryCount === 0) {
        if (isAuthenticated && sessionId) {
          // Authenticated user: save to database
          await saveMessage("user", userMessage);
        } else if (isGuest) {
          // Guest user: save to local state only (sessionId may exist for artifact bundling)
          await saveMessage("user", userMessage);
        }
      }

      // NOTE: sanitizeImageArtifacts helper removed - no longer needed since
      // artifacts are now persisted in artifact_versions table and linked via artifact_ids.
      // Messages contain only text markers like "[Artifact: Title]" instead of XML.

      const requestBody = {
        messages: messages
          .concat([{ role: "user", content: userMessage } as ChatMessage])
          .map((m) => ({ role: m.role, content: m.content })),
        sessionId: isAuthenticated ? sessionId : undefined,
        currentArtifact,
        isGuest: !isAuthenticated,
        toolChoice,
        includeReasoning: true, // Enable Chain of Thought reasoning
        // Pre-generated ID for artifact DB linking (backend uses this as message_id FK)
        assistantMessageId,
      };

      console.log("🚀 [useChatMessages.streamChat] Sending request:", {
        toolChoice,
        sessionId: isAuthenticated ? sessionId : 'guest',
        isGuest,
        hasSession: !!session,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Only send auth header if authenticated (both isGuest=false AND session exists)
            ...(isAuthenticated && session ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal,
        }
      );

      // Handle rate limit exceeded (429)
      if (response.status === 429) {
        const errorData = await response.json();
        const rateLimitHeaders = parseRateLimitHeaders(response.headers);

        if (rateLimitHeaders && options?.onRateLimitUpdate) {
          options.onRateLimitUpdate(rateLimitHeaders);
        }

        setRateLimitPopup({
          isOpen: true,
          resetAt: errorData.resetAt,
        });

        // Phase 1: Clear isLoading on error exit path
        setIsLoading(false);
        onDone();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Edge function error response:", errorData);

        // Handle retryable errors (503 - service temporarily unavailable)
        if (response.status === 503 && errorData.retryable) {
          throw new Error("SERVICE_UNAVAILABLE");
        }

        const errorMsg = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "Failed to get response";
        throw new Error(errorMsg);
      }

      // Parse and update rate limit headers on success
      const rateLimitHeaders = parseRateLimitHeaders(response.headers);
      if (rateLimitHeaders && options?.onRateLimitUpdate) {
        options.onRateLimitUpdate(rateLimitHeaders);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      fullResponse = "";
      tokenCount = 0;
      artifactDetected = false;
      let artifactClosed = false;
      let artifactInProgress = toolChoice === 'generate_artifact';
      let imageInProgress = toolChoice === 'generate_image';
      let reasoningSteps: StructuredReasoning | undefined; // Store reasoning data
      let reasoningText: string | undefined; // Store raw reasoning text for fallback display
      let searchResults: WebSearchResults | undefined; // Store web search results
      let lastSequence = 0; // Track SSE event sequence
      let lastReasoningStatus: string | undefined; // Track last reasoning status for preservation
      let currentToolExecution: ToolExecution | undefined; // Track current tool execution state

      // Stream timeout protection
      const CHAT_STREAM_TIMEOUT_MS = 120000; // 2 minutes max for chat streaming
      let lastDataReceivedTime = Date.now();

      const updateProgress = (): StreamProgress => {
        // Detect artifact tags
        if (!artifactDetected && fullResponse.includes('<artifact')) {
          artifactDetected = true;
        }
        if (!artifactClosed && fullResponse.includes('</artifact>')) {
          artifactClosed = true;
        }

        // Calculate percentage based on stage
        let percentage = 0;
        let stage: GenerationStage = "analyzing";
        let message = "";

        if (tokenCount < 50) {
          stage = "analyzing";
          message = "Analyzing the user request...";
          percentage = Math.min(15, (tokenCount / 50) * 15);
        } else if (tokenCount < 150 && !artifactDetected) {
          stage = "planning";
          message = "Planning the implementation approach...";
          percentage = 15 + Math.min(25, ((tokenCount - 50) / 100) * 25);
        } else if (artifactDetected && !artifactClosed) {
          stage = "generating";
          message = "Generating the solution code...";
          percentage = 40 + Math.min(45, (tokenCount / 1000) * 45);
        } else if (artifactClosed || tokenCount > 500) {
          stage = "finalizing";
          message = "Finalizing the generated response...";
          percentage = 85 + Math.min(15, ((tokenCount - 500) / 200) * 15);
        } else {
          stage = "generating";
          message = "Creating the final response...";
          percentage = 40 + Math.min(45, (tokenCount / 1000) * 45);
        }

        return {
          stage,
          message,
          artifactDetected,
          percentage: Math.min(99, Math.round(percentage)),
          artifactInProgress: artifactInProgress || (artifactDetected && !artifactClosed),
          imageInProgress,
          reasoningSteps, // Include reasoning in progress updates
          searchResults, // Include search results in progress updates
          reasoningStatus: lastReasoningStatus, // Preserve status for ticker display
          streamingReasoningText: reasoningText, // Preserve raw text for fallback
          toolExecution: currentToolExecution, // Preserve tool execution state
          streamingArtifacts: collectedArtifacts.length > 0 ? collectedArtifacts : undefined, // Include artifact data for streaming display
        };
      };

      // BUG FIX (2025-12-21): Use labeled loop to properly exit when [DONE] is received
      // Without the label, `break` only exits the inner buffer processing loop,
      // causing the outer loop to call reader.read() again which can hang if
      // the server hasn't fully closed the connection yet.
      streamLoop: while (true) {
        // Check for timeout - use "last data received" to avoid timing out during active streaming
        const timeSinceLastData = Date.now() - lastDataReceivedTime;
        if (timeSinceLastData > CHAT_STREAM_TIMEOUT_MS) {
          throw new Error('Stream timeout: Response generation took too long. Please try again.');
        }

        const { done, value } = await reader.read();
        if (done) break;

        // Update last data received timestamp
        lastDataReceivedTime = Date.now();

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break streamLoop; // CRITICAL: Exit BOTH loops

          try {
            const parsed = JSON.parse(jsonStr);

            // ========================================
            // CLAUDE-LIKE STREAMING: Handle reasoning events
            // ========================================
            // The backend now sends reasoning as individual steps (reasoning_step)
            // followed by a complete event (reasoning_complete). This creates
            // a smooth, animated experience matching Claude's extended thinking.
            // Legacy 'reasoning' events are still supported for backward compat.
            // ========================================

            // Handle new progressive reasoning_step events
            if (parsed.type === 'reasoning_step') {
              { // Added block to scope lexical declarations
                const step = parsed.step as ReasoningStep;
                const stepIndex = parsed.stepIndex as number;

                // Build up reasoningSteps incrementally
                if (!reasoningSteps) {
                  reasoningSteps = { steps: [] };
                }
                reasoningSteps = {
                  ...reasoningSteps,
                  steps: [...reasoningSteps.steps, step],
                };

                console.log(`[StreamProgress] Received reasoning step ${stepIndex + 1}: "${step.title}"`);

                const progress = updateProgress();
                progress.reasoningSteps = reasoningSteps;
                onDelta('', progress);
              }
              continue; // Skip to next event
            }

            // Handle reasoning_complete event (final structured data for saving)
            if (parsed.type === 'reasoning_complete') {
              if (parsed.reasoningSteps) {
                reasoningSteps = parsed.reasoningSteps as StructuredReasoning;
              }
              // FIX: Capture raw reasoning text for fallback display when no structured steps
              if (parsed.reasoning) {
                reasoningText = parsed.reasoning as string;
              }

              console.log(`[StreamProgress] Reasoning complete: ${reasoningSteps?.steps?.length || 0} steps, ${reasoningText?.length || 0} chars raw text`);

              const progress = updateProgress();
              progress.reasoningSteps = reasoningSteps;
              progress.streamingReasoningText = reasoningText;
              onDelta('', progress);

              continue; // Skip to next event
            }

            // Handle reasoning_chunk event (streamed raw reasoning text)
            if (parsed.type === 'reasoning_chunk') {
              const chunk = parsed.chunk as string | undefined;
              if (chunk) {
                reasoningText = (reasoningText || '') + chunk;
              }

              const progress = updateProgress();
              onDelta('', progress);

              continue;
            }

            // Handle reasoning_status event (GLM-4.5-Air summaries)
            if (parsed.type === 'reasoning_status') {
              const status = parsed.content as string;
              console.log(`[StreamProgress] Reasoning status: "${status}"`);

              // Store for preservation in updateProgress()
              lastReasoningStatus = status;

              const progress = updateProgress();
              onDelta('', progress);

              continue;
            }

            // Handle reasoning_final event (completion summary from ReasoningProvider)
            if (parsed.type === 'reasoning_final') {
              const finalMessage = parsed.message as string;
              console.log(`[StreamProgress] Reasoning final: "${finalMessage}"`);

              // Update the reasoning status to show completion
              lastReasoningStatus = finalMessage;

              const progress = updateProgress();
              onDelta('', progress);

              continue;
            }

            // Handle status_update event (artifact generation status updates)
            if (parsed.type === 'status_update') {
              const status = parsed.status as string;
              const isFinal = parsed.final as boolean | undefined;
              console.log(`[StreamProgress] Status update: "${status}"${isFinal ? ' (final)' : ''}`);

              lastReasoningStatus = status;

              const progress = updateProgress();
              onDelta('', progress);

              continue;
            }

            // COMPATIBILITY: Handle batch 'reasoning' event format from /chat endpoint.
            // The /chat endpoint sends reasoning as a single event (all steps at once),
            // while /generate-artifact streams individual reasoning_step events.
            // Both formats must be supported for graceful degradation during deployments.
            if (parsed.type === 'reasoning') {
              // Check sequence number to prevent out-of-order AND duplicate updates
              // Use <= to skip duplicates (same sequence processed twice)
              // but only after we've received at least one event (reasoningSteps exists)
              if (reasoningSteps && parsed.sequence <= lastSequence) {
                console.warn('[StreamProgress] Ignoring out-of-order or duplicate reasoning event');
                continue;
              }
              lastSequence = parsed.sequence;

              // Store and send the complete reasoning data
              // The ReasoningDisplay component will handle character-by-character streaming
              reasoningSteps = parsed.data;

              const progress = updateProgress();
              progress.reasoningSteps = reasoningSteps;
              onDelta('', progress);

              console.log('[StreamProgress] Received batch reasoning event with', reasoningSteps?.steps?.length || 0, 'steps');
              continue; // Skip to next event
            }

            // ========================================
            // TOOL EXECUTION: Handle tool calls from backend
            // ========================================
            if (parsed.type === 'tool_call_start') {
              const toolName = parsed.toolName as string;
              const toolArgs = parsed.arguments as Record<string, unknown> | undefined;
              const timestamp = parsed.timestamp as number;

              console.log(`🔧 [StreamProgress] Tool call started: ${toolName}`, toolArgs);

              // Update tracked tool execution state
              currentToolExecution = {
                toolName,
                arguments: toolArgs,
                timestamp,
              };

              if (toolName === 'generate_artifact') {
                artifactInProgress = true;
              }
              if (toolName === 'generate_image') {
                imageInProgress = true;
              }

              const progress = updateProgress();
              onDelta('', progress);

              continue;
            }

            if (parsed.type === 'tool_result') {
              const toolName = parsed.toolName as string;
              const success = parsed.success as boolean;
              const sourceCount = parsed.sourceCount as number | undefined;
              const latencyMs = parsed.latencyMs as number | undefined;
              const timestamp = parsed.timestamp as number;

              console.log(`✅ [StreamProgress] Tool result: ${toolName} - ${success ? 'success' : 'failed'}`, {
                sourceCount,
                latencyMs
              });

              // Update tracked tool execution state with result
              currentToolExecution = {
                toolName,
                success,
                sourceCount,
                latencyMs,
                timestamp,
              };

              if (toolName === 'generate_artifact' && success === false) {
                artifactInProgress = false;
              }
              if (toolName === 'generate_image' && success === false) {
                imageInProgress = false;
              }

              const progress = updateProgress();
              onDelta('', progress);

              continue;
            }

            // ========================================
            // WARNING: Handle incomplete responses or interruptions
            // ========================================
            if (parsed.type === 'warning') {
              const warningMessage = parsed.message as string;
              console.warn('[StreamProgress] Warning from server:', warningMessage);

              // Show toast notification so user knows response may be incomplete
              toast({
                title: "Response Warning",
                description: warningMessage || "The response may be incomplete.",
                variant: "default",
              });

              continue;
            }

            // ========================================
            // ERROR: Handle error events from backend
            // Without this handler, backend errors are silently ignored and users
            // see misleading "empty response" messages instead of actual errors.
            // ========================================
            if (parsed.type === 'error') {
              // Type guards for defensive programming - backend may send malformed data
              const errorMessage = typeof parsed.error === 'string'
                ? parsed.error
                : String(parsed.error ?? 'Unknown error');
              const isRetryable = parsed.retryable === true;

              console.error('[StreamProgress] Error from server:', errorMessage, { retryable: isRetryable });

              // Show destructive toast with actual error message
              // Include retry hint for retryable errors (e.g., rate limits, timeouts)
              toast({
                title: "Chat Error",
                description: isRetryable
                  ? `${errorMessage}. Please try again.`
                  : errorMessage,
                variant: "destructive",
              });

              // Throw to stop processing - this prevents the misleading "empty response"
              // error from appearing after the stream ends with no content
              throw new Error(errorMessage);
            }

            // ========================================
            // WEB SEARCH: Handle search results from Tavily API
            // ========================================
            if (parsed.type === 'web_search') {
              // Store the complete search results
              searchResults = parsed.data;

              // Update progress immediately with search results
              const progress = updateProgress();
              progress.searchResults = searchResults;
              onDelta('', progress);

              console.log('[StreamProgress] Received web search results:', {
                query: searchResults?.query,
                sourceCount: searchResults?.sources?.length || 0,
              });

              continue; // Skip to next event
            }

            // ========================================
            // ARTIFACT COMPLETE: Handle artifact from tool-calling chat
            // Artifacts are now persisted to artifact_versions table and linked via artifact_ids.
            // Message content contains only a text marker, not XML.
            // ========================================
            if (parsed.type === 'artifact_complete') {
              const artifactCode = parsed.artifactCode as string;
              const artifactType = parsed.artifactType as string;
              const artifactTitle = parsed.artifactTitle as string;
              const artifactReasoning = parsed.reasoning as string | undefined;
              const artifactId = parsed.artifactId as string | undefined;

              console.log(`[StreamProgress] Received artifact_complete from tool-calling: type=${artifactType}, artifactId=${artifactId || 'none'}, length=${artifactCode?.length || 0}`);

              // Generate temporary ID for guest artifacts (not persisted to DB)
              // Guest artifacts don't have a DB artifact_id, so we create a local ID
              const effectiveArtifactId = artifactId || `guest-art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

              // Collect artifact ID for DB-persisted artifacts only
              if (artifactId) {
                collectedArtifactIds.push(artifactId);
              }

              if (artifactCode) {
                // ALWAYS collect artifact data for streaming display (guest and authenticated users)
                // For guest users: artifact is only in memory (localStorage), never persisted to DB
                // For authenticated users: artifact is in DB, but we collect here for immediate display
                collectedArtifacts.push({
                  id: effectiveArtifactId,
                  type: artifactType,
                  title: artifactTitle,
                  content: artifactCode,
                  language: undefined, // Language can be inferred from type
                });
                console.log(`[StreamProgress] Collected artifact data for streaming display: ${effectiveArtifactId}${!artifactId ? ' (guest)' : ''}`);

                // Add simple text marker instead of XML - artifacts are loaded from DB via artifact_ids
                const displayTitle = artifactTitle || 'Generated Artifact';
                const textMarker = `[Artifact: ${displayTitle}]`;

                // Prepend marker to response (artifact comes before continuation text)
                fullResponse = textMarker + (fullResponse ? '\n\n' + fullResponse : '');
                artifactDetected = true;
                artifactClosed = true;
                artifactInProgress = false;

                // Store reasoning if provided
                if (artifactReasoning && !reasoningText) {
                  reasoningText = artifactReasoning;
                }

                // Pass text marker to onDelta for streaming display
                const progress = updateProgress();
                onDelta(textMarker + '\n\n', progress);
              }

              continue;
            }

            // ========================================
            // IMAGE COMPLETE: Handle image from tool-calling chat
            // Images are now persisted to artifact_versions table and linked via artifact_ids.
            // Message content contains only a text marker, not XML.
            // ========================================
            if (parsed.type === 'image_complete') {
              const imageUrl = parsed.imageUrl as string;
              const imageData = parsed.imageData as string;
              const storageSucceeded = parsed.storageSucceeded as boolean;
              const imageArtifactId = parsed.artifactId as string | undefined;

              console.log(`[StreamProgress] Received image_complete from tool-calling: storage=${storageSucceeded}, artifactId=${imageArtifactId || 'none'}`);

              // Collect artifact ID for message association (backend saved it to artifact_versions table)
              if (imageArtifactId) {
                collectedArtifactIds.push(imageArtifactId);
              }

              // Use storage URL if available, otherwise fall back to base64 data
              const displayUrl = imageUrl || imageData;
              if (displayUrl) {
                // Collect full image artifact data for immediate streaming display
                if (imageArtifactId && displayUrl) {
                  collectedArtifacts.push({
                    id: imageArtifactId,
                    type: 'image',
                    title: 'Generated Image',
                    content: displayUrl, // URL or base64
                    language: undefined,
                  });
                  console.log(`[StreamProgress] Collected image artifact data for streaming display: ${imageArtifactId}`);
                }

                // Add simple text marker instead of XML - images are loaded from DB via artifact_ids
                const textMarker = '[Image: Generated Image]';

                // Prepend marker to response
                fullResponse = textMarker + (fullResponse ? '\n\n' + fullResponse : '');
                artifactDetected = true;
                artifactClosed = true;
                imageInProgress = false;

                console.log(`[StreamProgress] Image marker added to fullResponse, length=${fullResponse.length}`);

                // Pass text marker to onDelta for streaming display
                const progress = updateProgress();
                onDelta(textMarker + '\n\n', progress);
              } else {
                // If image data is missing but event was received,
                // still mark response as complete to prevent infinite retry loop
                console.warn(`[StreamProgress] image_complete event received but no imageUrl or imageData`);

                imageInProgress = false;

                // Add placeholder to prevent empty response error
                const placeholderMarker = '[Image: Generated Image (unavailable)]';
                if (!fullResponse) {
                  fullResponse = placeholderMarker;
                }

                const progress = updateProgress();
                onDelta(placeholderMarker + '\n\n', progress);
              }

              continue;
            }

            // Support both Gemini and OpenAI formats
            // Gemini: candidates[0].content.parts[0].text
            // OpenAI (legacy): choices[0].delta.content
            const content = (parsed.candidates?.[0]?.content?.parts?.[0]?.text ||
              parsed.choices?.[0]?.delta?.content) as string | undefined;

            if (content) {
              fullResponse += content;
              tokenCount += content.split(/\s+/).length;
              const progress = updateProgress();
              onDelta(content, progress);
            }
          } catch (parseError) {
            // Only recover from JSON parse errors - other errors should propagate
            if (parseError instanceof SyntaxError) {
              // Incomplete JSON chunk - prepend back to buffer for next iteration
              textBuffer = line + "\n" + textBuffer;
              break;
            }
            // Re-throw unexpected errors to avoid silent failures
            throw parseError;
          }
        }
      }

      // CRITICAL: Validate content before saving to prevent blank messages
      // Safety net: Auto-retry once if response is empty
      // (Legacy edge case - native function calling should prevent this)
      if (!fullResponse || fullResponse.length === 0) {
        const MAX_EMPTY_RETRIES = 1;
        if (retryCount < MAX_EMPTY_RETRIES) {
          console.warn(`[useChatMessages] Empty response - auto-retrying (attempt ${retryCount + 1}/${MAX_EMPTY_RETRIES + 1})`);
          toast({
            title: "Retrying...",
            description: "Response was incomplete. Trying again automatically.",
            variant: "default",
          });
          // Small delay before retry to avoid hammering the API
          await new Promise(resolve => setTimeout(resolve, 500));
          return streamChat(userMessage, onDelta, onDone, currentArtifact, toolChoice, retryCount + 1, abortSignal);
        }

        console.error("[useChatMessages] Empty chat response after retries - not saving blank message");
        // Phase 1: Clear isLoading on error exit path
        setIsLoading(false);
        onDone();
        toast({
          title: "Response Error",
          description: "The AI generated an empty response. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Save assistant message first, then signal completion
      // This prevents a race condition where streamingMessage is cleared before the saved message appears
      // FIX: Pass reasoningText for fallback display when no structured steps are available
      // BUG FIX (2025-12-21): Add timeout to prevent indefinite hang if Supabase is slow
      // Pass pre-generated ID and collected artifact IDs for proper DB linking
      // FIX: Include full artifact data for guest users (stored in localStorage, not DB)
      const SAVE_MESSAGE_TIMEOUT_MS = 10000; // 10 second timeout
      const savePromise = saveMessage(
        "assistant",
        fullResponse,
        reasoningText,
        reasoningSteps,
        searchResults,
        assistantMessageId,
        collectedArtifactIds.length > 0 ? collectedArtifactIds : undefined,
        collectedArtifacts.length > 0 ? collectedArtifacts : undefined
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message save timeout')), SAVE_MESSAGE_TIMEOUT_MS)
      );

      try {
        await Promise.race([savePromise, timeoutPromise]);
      } catch (saveError) {
        // Timeout or unexpected error - saveMessage() handles its own errors internally
        // and adds a temp message to local state, so we just log here
        console.error("[useChatMessages] Message save error (message still visible locally):", saveError);
      }

      // Clear streaming state synchronously to prevent race condition
      // Phase 1: Clear isLoading on success exit path
      flushSync(() => {
        setIsLoading(false);
      });

      artifactInProgress = false;
      imageInProgress = false;
      onDelta('', updateProgress());

      onDone();
    } catch (error: unknown) {
      // Handle stream cancellation gracefully (don't show error toast)
      if (error instanceof Error && error.name === 'AbortError') {
        // Log with context to help distinguish legitimate cancellation from bugs
        console.log("Stream cancelled", {
          artifactDetected,
          tokenCount,
          hadContent: fullResponse.length > 0,
        });
        // Phase 1: Clear isLoading on cancellation
        setIsLoading(false);
        onDone();
        return;
      }

      console.error("Stream error:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle timeout errors specifically
      if (errorMessage.includes('Stream timeout')) {
        // Phase 1: Clear isLoading on timeout error exit path
        setIsLoading(false);
        toast({
          title: "Request Timeout",
          description: errorMessage,
          variant: "destructive",
          duration: 8000,
        });
        onDone();
        return;
      }

      // Handle retryable errors with exponential backoff
      if (errorMessage === "SERVICE_UNAVAILABLE" && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        const retryNumber = retryCount + 1;

        toast({
          title: "AI service busy",
          description: `The AI is temporarily overloaded. Retrying in ${delay / 1000} seconds... (Attempt ${retryNumber}/${MAX_RETRIES})`,
          variant: "default",
        });

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry with incremented count
        // Don't clear isLoading - the nested call maintains the loading state
        // When the final retry completes/fails, IT will clear isLoading
        return streamChat(userMessage, onDelta, onDone, currentArtifact, toolChoice, retryCount + 1, abortSignal);
      }

      // Non-retryable error - clear loading and show error
      // Phase 1: Clear isLoading on error exit path
      setIsLoading(false);
      const authErrorMessage = getAuthErrorMessage(error);
      toast({
        title: "Error",
        description: authErrorMessage === errorMessage && errorMessage === "SERVICE_UNAVAILABLE"
          ? "The AI service is temporarily unavailable. Please try again in a few moments."
          : authErrorMessage,
        variant: "destructive",
      });
      onDone();
    }
  };

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!sessionId) {
      // For guest users, delete from local state only (persist via useEffect)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      return;
    }

    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      // Optimistically update local state
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error: unknown) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }, [sessionId, guestSession]);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    if (!sessionId) {
      // For guest users, update local state only (persist via useEffect)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg
        )
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ content })
        .eq("id", messageId);

      if (error) throw error;

      // Optimistically update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg
        )
      );
    } catch (error: unknown) {
      console.error("Error updating message:", error);
      throw error;
    }
  }, [sessionId, guestSession]);

  return {
    messages,
    isLoading,
    streamChat,
    saveMessage,
    deleteMessage,
    updateMessage,
    artifactRenderStatus,
    rateLimitPopup,
    setRateLimitPopup,
  };
}
