import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/utils/authHelpers";
import { chatRequestThrottle } from "@/utils/requestThrottle";
import { StructuredReasoning, parseReasoningSteps, ReasoningStep } from "@/types/reasoning";
import { WebSearchResults } from "@/types/webSearch";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string | null;
  reasoning_steps?: StructuredReasoning | null; // New: structured reasoning data
  search_results?: WebSearchResults | null; // New: web search results data
  created_at: string;
}

export type GenerationStage =
  | "analyzing"
  | "planning"
  | "generating"
  | "finalizing"
  | "complete";

export interface StreamProgress {
  stage: GenerationStage;
  message: string;
  artifactDetected: boolean;
  percentage: number;
  reasoningSteps?: StructuredReasoning; // Structured reasoning for streaming
  streamingReasoningText?: string; // Raw reasoning text being streamed (GLM native thinking)
  reasoningStatus?: string; // Semantic status update from GLM-4.5-AirX
  searchResults?: WebSearchResults; // Web search results for streaming
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
}

export function useChatMessages(
  sessionId: string | undefined,
  options?: UseChatMessagesOptions
) {
  const isGuest = options?.isGuest ?? false;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    // Skip database fetch for guests or when no sessionId
    // Guests use local state only (messages are in-memory for their session)
    if (isGuest || !sessionId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const typedData = (data || []).map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      }));

      setMessages(typedData);
    } catch (error: any) {
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

  const saveMessage = async (
    role: "user" | "assistant",
    content: string,
    reasoning?: string,
    reasoningSteps?: StructuredReasoning,
    searchResults?: WebSearchResults
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
        id: crypto.randomUUID(),
        session_id: sessionId || "guest", // Use provided sessionId for artifact bundling, or "guest" fallback
        role,
        content,
        reasoning: reasoning || null,
        reasoning_steps: validatedReasoningSteps, // FIX: Use validated reasoning steps
        search_results: searchResults || null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, guestMessage]);
      return guestMessage;
    }

    // For authenticated users, save to database
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          role,
          content,
          reasoning,
          reasoning_steps: validatedReasoningSteps,
          search_results: searchResults || null,
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
    } catch (error: any) {
      console.error("Error saving message:", error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      });
    }
  };

  const streamChat = async (
    userMessage: string,
    onDelta: (chunk: string, progress: StreamProgress) => void,
    onDone: () => void,
    currentArtifact?: { title: string; type: string; content: string },
    forceImageMode = false,
    forceArtifactMode = false,
    retryCount = 0,
    abortSignal?: AbortSignal
  ) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [2000, 5000, 10000]; // Exponential backoff: 2s, 5s, 10s

    setIsLoading(true);

    try {
      // Client-side throttling: silently wait for token (protects API from burst requests)
      await chatRequestThrottle.waitForToken();
      // Get actual auth status from server (not client flags)
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthenticated = !!session;

      // Save user message ONLY on first attempt (not on retries to avoid duplicates)
      if (retryCount === 0) {
        if (isAuthenticated && sessionId) {
          // Authenticated user: save to database
          await saveMessage("user", userMessage);
        } else if (!isAuthenticated) {
          // Guest user: save to local state only (sessionId may exist for artifact bundling)
          await saveMessage("user", userMessage);
        }
      }

      const requestBody = {
        messages: messages
          .concat([{ role: "user", content: userMessage } as ChatMessage])
          .map((m) => ({ role: m.role, content: m.content })),
        sessionId: isAuthenticated ? sessionId : undefined,
        currentArtifact,
        isGuest: !isAuthenticated,
        forceImageMode,
        forceArtifactMode,
        includeReasoning: true, // Enable Chain of Thought reasoning
      };

      console.log("🚀 [useChatMessages.streamChat] Sending request:", {
        forceImageMode,
        forceArtifactMode,
        sessionId: isAuthenticated ? sessionId : 'guest'
      });

      // ============================================================================
      // DIRECT ARTIFACT ROUTING (Bypass /chat timeout issue)
      // ============================================================================
      // When forceArtifactMode is true OR the prompt looks like an artifact request,
      // call /generate-artifact directly instead of going through /chat.
      // This avoids the Supabase Edge Function timeout issue where /chat times out
      // (50s) waiting for /generate-artifact (100s+ with Kimi K2).
      // ============================================================================

      // Client-side artifact detection patterns
      const artifactPatterns = [
        /^Build a React artifact/i,           // Carousel prompts
        /^Create a (.*) (app|game|component|dashboard|tracker|calculator)/i,
        /^Make a (.*) (app|game|component|dashboard|tracker|calculator)/i,
        /^Build a (.*) (app|game|component|dashboard|tracker|calculator)/i,
        /^Generate a React/i,
        /\b(todo|counter|timer|quiz|trivia|snake|frogger|tic-tac-toe|memory)\b.*\b(app|game|component)\b/i,
      ];

      const isArtifactRequest = forceArtifactMode ||
        artifactPatterns.some(pattern => pattern.test(userMessage));

      if (isArtifactRequest) {
        console.log("🎨 [useChatMessages] Direct artifact routing - using SSE streaming from /generate-artifact");

        // Send initial progress immediately
        onDelta("", {
          stage: "analyzing",
          message: "Analyzing your request...",
          artifactDetected: true,
          percentage: 5,
        });

        // ============================================================================
        // GLM-NATIVE THINKING FLOW: Stream reasoning + content from single endpoint
        // ============================================================================
        // Instead of calling /generate-reasoning and /generate-artifact in parallel,
        // we call /generate-artifact with stream=true to get GLM's native thinking
        // streamed in real-time, followed by the artifact content.
        //
        // SSE Events:
        // - reasoning_chunk: Live reasoning text as GLM thinks
        // - reasoning_complete: Full reasoning text (for saving)
        // - content_chunk: Artifact code chunks
        // - artifact_complete: Final artifact + structured reasoning
        // - error: Error message
        // ============================================================================

        const artifactResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-artifact`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({
              prompt: userMessage,
              artifactType: "react",
              sessionId: isAuthenticated ? sessionId : undefined,
              stream: true, // Enable SSE streaming
            }),
            signal: abortSignal,
          }
        );

        // Handle rate limit exceeded (429)
        if (artifactResponse.status === 429) {
          const errorData = await artifactResponse.json();
          const resetTime = errorData.resetAt
            ? new Date(errorData.resetAt).toLocaleTimeString()
            : "soon";

          toast({
            title: "Rate Limit Exceeded",
            description: `${errorData.error || "Too many requests."} Rate limit resets at ${resetTime}.`,
            variant: "destructive",
            duration: 10000,
          });

          setIsLoading(false);
          onDone();
          return;
        }

        if (!artifactResponse.ok) {
          const errorData = await artifactResponse.json();
          console.error("Artifact generation error:", errorData);

          if (artifactResponse.status === 503 && errorData.retryable) {
            throw new Error("SERVICE_UNAVAILABLE");
          }

          throw new Error(errorData.error || "Failed to generate artifact");
        }

        // Check content-type to determine if we got SSE streaming or JSON fallback
        const contentType = artifactResponse.headers.get("content-type") || "";
        const isSSEStream = contentType.includes("text/event-stream");

        // FALLBACK: Handle JSON response (non-streaming backend)
        // This occurs when the Edge Function hasn't been deployed with streaming support
        if (!isSSEStream && contentType.includes("application/json")) {
          console.log("📦 [useChatMessages] Falling back to JSON response (non-streaming backend)");

          const jsonData = await artifactResponse.json();

          if (!jsonData.success || !jsonData.artifactCode) {
            throw new Error(jsonData.error || "Failed to generate artifact");
          }

          // Update progress to show we're generating
          onDelta("", {
            stage: "generating",
            message: "Generating artifact...",
            artifactDetected: true,
            percentage: 50,
            reasoningSteps: jsonData.reasoningSteps,
          });

          // Simulate brief progress for UX
          await new Promise(resolve => setTimeout(resolve, 100));

          // Final progress update - pass empty string to avoid flashing artifact code
          // The artifact will be properly rendered via saveMessage() -> MessageWithArtifacts
          onDelta("", {
            stage: "complete",
            message: "Done!",
            artifactDetected: true,
            percentage: 100,
            reasoningSteps: jsonData.reasoningSteps,
          });

          // Clear streaming state
          setIsLoading(false);
          onDone();

          // Small delay to ensure streaming state is cleared
          await new Promise(resolve => setTimeout(resolve, 50));

          // Save the assistant response with reasoning data
          await saveMessage(
            "assistant",
            jsonData.artifactCode,
            jsonData.reasoning || undefined,
            jsonData.reasoningSteps || undefined
          );

          return;
        }

        // Process SSE stream
        const reader = artifactResponse.body?.getReader();
        if (!reader) {
          throw new Error("No response body for streaming");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let streamingReasoningText = "";
        let streamingContentText = "";
        // Track structured reasoning steps as they stream in (Claude-like)
        let streamingReasoningSteps: StructuredReasoning = { steps: [] };
        let currentThinkingText = "Thinking...";
        let finalArtifactData: {
          artifactCode?: string;
          reasoning?: string;
          reasoningSteps?: StructuredReasoning;
        } | null = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete lines (SSE format)
            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n\n")) !== -1) {
              const eventBlock = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 2);

              // Parse SSE event
              const eventMatch = eventBlock.match(/^event: (.+)$/m);
              const dataMatch = eventBlock.match(/^data: (.+)$/m);

              if (!eventMatch || !dataMatch) continue;

              const eventType = eventMatch[1];
              let eventData: Record<string, unknown>;

              try {
                eventData = JSON.parse(dataMatch[1]);
              } catch {
                console.warn("Failed to parse SSE data:", dataMatch[1]);
                continue;
              }

              // Handle different event types
              // ============================================================================
              // CLAUDE-LIKE STREAMING: Handle structured reasoning steps
              // ============================================================================
              // The backend now parses GLM's raw reasoning into structured steps and
              // streams them progressively. This provides a clean UX similar to Claude's
              // extended thinking, instead of showing verbose raw thinking text.
              //
              // Event types:
              // - reasoning_step: New complete step detected (phase, title, icon, items)
              // - thinking_update: Current thinking indicator (for pill display)
              // - reasoning_complete: Final structured reasoning + raw text
              // - content_chunk: Artifact code chunks
              // - artifact_complete: Final artifact data
              // ============================================================================
              switch (eventType) {
                case "reasoning_step": {
                  // New structured reasoning step detected by server
                  const step = eventData.step as ReasoningStep;
                  const stepIndex = eventData.stepIndex as number;
                  currentThinkingText = (eventData.currentThinking as string) || step.title;

                  // Add step to accumulated structured reasoning
                  streamingReasoningSteps = {
                    ...streamingReasoningSteps,
                    steps: [...streamingReasoningSteps.steps, step],
                  };

                  console.log(`🧠 [useChatMessages] Reasoning step ${stepIndex + 1}: "${step.title}"`);

                  // Update progress with structured reasoning (Claude-like)
                  onDelta("", {
                    stage: "analyzing",
                    message: currentThinkingText,
                    artifactDetected: true,
                    percentage: Math.min(10 + (stepIndex * 12), 45),
                    reasoningSteps: streamingReasoningSteps,
                  });
                  break;
                }

                case "thinking_update": {
                  // Periodic update during GLM native thinking
                  // We DON'T show the raw currentThinking text - instead we just update progress
                  // The pill will show "Thinking..." until structured steps arrive
                  const progress = (eventData.progress as number) || 15;

                  onDelta("", {
                    stage: "analyzing",
                    message: "Thinking...", // Always use clean message, not raw text
                    artifactDetected: true,
                    percentage: Math.min(progress, 45),
                    reasoningSteps: streamingReasoningSteps.steps.length > 0 ? streamingReasoningSteps : undefined,
                  });
                  break;
                }

                case "reasoning_chunk":
                  // LEGACY: Fallback for raw reasoning chunks (if backend sends them)
                  // This path is deprecated but kept for backward compatibility
                  streamingReasoningText += eventData.chunk as string;
                  onDelta("", {
                    stage: "analyzing",
                    message: "Thinking...",
                    artifactDetected: true,
                    percentage: Math.min(10 + (streamingReasoningText.length / 50), 45),
                    streamingReasoningText,
                  });
                  break;

                case "reasoning_complete":
                  console.log(`🧠 [useChatMessages] Reasoning complete: ${(eventData.reasoning as string)?.length || 0} chars, ${(eventData.stepCount as number) || 0} steps`);

                  // Use server-provided structured reasoning if available
                  if (eventData.reasoningSteps) {
                    streamingReasoningSteps = eventData.reasoningSteps as StructuredReasoning;
                  }
                  if (eventData.reasoning) {
                    streamingReasoningText = eventData.reasoning as string;
                  }

                  // Transition to generating stage
                  onDelta("", {
                    stage: "generating",
                    message: "Generating artifact...",
                    artifactDetected: true,
                    percentage: 50,
                    reasoningSteps: streamingReasoningSteps.steps.length > 0 ? streamingReasoningSteps : undefined,
                    streamingReasoningText: streamingReasoningSteps.steps.length === 0 ? streamingReasoningText : undefined,
                  });
                  break;

                case "content_chunk":
                  // Append to streaming content (accumulate but DON'T display in chat)
                  // The artifact code contains <artifact> tags which must be parsed by
                  // MessageWithArtifacts AFTER saveMessage() - not streamed as raw text
                  streamingContentText += eventData.chunk as string;

                  // Update progress only - pass empty string to avoid showing raw artifact code
                  onDelta("", {
                    stage: "generating",
                    message: "Writing code...",
                    artifactDetected: true,
                    percentage: Math.min(50 + (streamingContentText.length / 200), 95),
                    reasoningSteps: streamingReasoningSteps.steps.length > 0 ? streamingReasoningSteps : undefined,
                  });
                  break;

                case "artifact_complete":
                  console.log("✅ [useChatMessages] Artifact stream complete");
                  finalArtifactData = {
                    artifactCode: eventData.artifactCode as string,
                    reasoning: eventData.reasoning as string,
                    reasoningSteps: (eventData.reasoningSteps as StructuredReasoning) ||
                      (streamingReasoningSteps.steps.length > 0 ? streamingReasoningSteps : undefined),
                  };
                  break;

                case "error":
                  console.error("SSE error:", eventData.error);
                  throw new Error(eventData.error as string);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!finalArtifactData?.artifactCode) {
          throw new Error("No artifact code received from stream");
        }

        console.log("✅ [useChatMessages] Artifact generated via stream, length:", finalArtifactData.artifactCode.length);

        // CRITICAL: Clear streaming state BEFORE saving to prevent duplicate keys
        setIsLoading(false);
        onDone();

        // Small delay to ensure streaming state is cleared before saving
        await new Promise(resolve => setTimeout(resolve, 50));

        // Save the assistant response with reasoning data
        await saveMessage(
          "assistant",
          finalArtifactData.artifactCode,
          finalArtifactData.reasoning || undefined,
          finalArtifactData.reasoningSteps || undefined
        );

        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal,
        }
      );

      // Parse rate limit headers from response
      const parseRateLimitHeaders = (headers: Headers): RateLimitHeaders | null => {
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
      };

      // Handle rate limit exceeded (429)
      if (response.status === 429) {
        const errorData = await response.json();
        const rateLimitHeaders = parseRateLimitHeaders(response.headers);

        if (rateLimitHeaders && options?.onRateLimitUpdate) {
          options.onRateLimitUpdate(rateLimitHeaders);
        }

        const resetTime = errorData.resetAt
          ? new Date(errorData.resetAt).toLocaleTimeString()
          : "soon";

        const retryMessage = rateLimitHeaders?.retryAfter
          ? `Please try again in ${rateLimitHeaders.retryAfter} seconds.`
          : `Rate limit resets at ${resetTime}.`;

        toast({
          title: "Rate Limit Exceeded",
          description: `${errorData.error || "Too many requests."} ${retryMessage}`,
          variant: "destructive",
          duration: 10000,
        });

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
      let fullResponse = "";
      let tokenCount = 0;
      let artifactDetected = false;
      let artifactClosed = false;
      let reasoningSteps: StructuredReasoning | undefined; // Store reasoning data
      let searchResults: WebSearchResults | undefined; // Store web search results
      let lastSequence = 0; // Track SSE event sequence

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
          message = "Analyzing request...";
          percentage = Math.min(15, (tokenCount / 50) * 15);
        } else if (tokenCount < 150 && !artifactDetected) {
          stage = "planning";
          message = "Planning approach...";
          percentage = 15 + Math.min(25, ((tokenCount - 50) / 100) * 25);
        } else if (artifactDetected && !artifactClosed) {
          stage = "generating";
          message = "Generating code...";
          percentage = 40 + Math.min(45, (tokenCount / 1000) * 45);
        } else if (artifactClosed || tokenCount > 500) {
          stage = "finalizing";
          message = "Finalizing response...";
          percentage = 85 + Math.min(15, ((tokenCount - 500) / 200) * 15);
        } else {
          stage = "generating";
          message = "Creating response...";
          percentage = 40 + Math.min(45, (tokenCount / 1000) * 45);
        }

        return {
          stage,
          message,
          artifactDetected,
          percentage: Math.min(99, Math.round(percentage)),
          reasoningSteps, // Include reasoning in progress updates
          searchResults, // Include search results in progress updates
        };
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

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

              continue; // Skip to next event
            }

            // Handle reasoning_complete event (final structured data for saving)
            if (parsed.type === 'reasoning_complete') {
              if (parsed.reasoningSteps) {
                reasoningSteps = parsed.reasoningSteps as StructuredReasoning;
              }

              console.log(`[StreamProgress] Reasoning complete: ${reasoningSteps?.steps?.length || 0} steps`);

              const progress = updateProgress();
              progress.reasoningSteps = reasoningSteps;
              onDelta('', progress);

              continue; // Skip to next event
            }

            // Handle reasoning_status event (GLM-4.5-AirX summaries)
            if (parsed.type === 'reasoning_status') {
              const status = parsed.content as string;
              console.log(`[StreamProgress] Reasoning status: "${status}"`);

              const progress = updateProgress();
              progress.reasoningStatus = status;
              onDelta('', progress);

              continue;
            }

            // LEGACY: Handle old 'reasoning' event format (all steps at once)
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

              console.log('[StreamProgress] Received legacy reasoning with', reasoningSteps?.steps?.length || 0, 'steps');
              continue; // Skip to next event
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

      // Save assistant message first, then signal completion
      // This prevents a race condition where streamingMessage is cleared before the saved message appears
      await saveMessage("assistant", fullResponse, undefined, reasoningSteps, searchResults);

      // Small delay to ensure React state updates have propagated
      await new Promise(resolve => setTimeout(resolve, 50));

      onDone();
    } catch (error: any) {
      // Handle stream cancellation gracefully (don't show error toast)
      if (error.name === 'AbortError') {
        console.log("Stream cancelled by user");
        onDone();
        return;
      }

      console.error("Stream error:", error);

      // Handle retryable errors with exponential backoff
      if (error.message === "SERVICE_UNAVAILABLE" && retryCount < MAX_RETRIES) {
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
        return streamChat(userMessage, onDelta, onDone, currentArtifact, forceImageMode, forceArtifactMode, retryCount + 1, abortSignal);
      }

      const errorMessage = getAuthErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage === error.message && error.message === "SERVICE_UNAVAILABLE"
          ? "The AI service is temporarily unavailable. Please try again in a few moments."
          : errorMessage,
        variant: "destructive",
      });
      onDone();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!sessionId) {
      // For guest users, delete from local state only
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
    } catch (error: any) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }, [sessionId]);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    if (!sessionId) {
      // For guest users, update local state only
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
    } catch (error: any) {
      console.error("Error updating message:", error);
      throw error;
    }
  }, [sessionId]);

  return {
    messages,
    isLoading,
    streamChat,
    saveMessage,
    deleteMessage,
    updateMessage,
  };
}
