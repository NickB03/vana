import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureValidSession, getAuthErrorMessage } from "@/utils/authHelpers";
import { chatRequestThrottle } from "@/utils/requestThrottle";
import { StructuredReasoning, parseReasoningSteps } from "@/types/reasoning";
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
  reasoningSteps?: StructuredReasoning; // New: structured reasoning for streaming
  searchResults?: WebSearchResults; // New: web search results for streaming
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

    if (validatedReasoningSteps === false || (reasoningSteps && !validatedReasoningSteps)) {
      console.warn("Invalid reasoning steps, using null instead", reasoningSteps);
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
      // DEBUG: Log what we're about to save
      const payload = {
        session_id: sessionId,
        role,
        content,
        reasoning,
        reasoning_steps: validatedReasoningSteps, // FIX: Use validated reasoning steps
        search_results: searchResults || null,
      };
      console.log("[DEBUG] Saving message to database:", {
        ...payload,
        content_preview: content.substring(0, 100),
        reasoning_steps_type: typeof validatedReasoningSteps,
        reasoning_steps_value: validatedReasoningSteps,
        search_results_type: typeof searchResults,
      });

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("[DEBUG] Database error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
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
    retryCount = 0
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
        console.log("🎨 [useChatMessages] Direct artifact routing - calling /generate-artifact + /generate-reasoning in parallel");

        // Send initial progress immediately
        onDelta("", {
          stage: "analyzing",
          message: "Analyzing your request...",
          artifactDetected: true,
          percentage: 5,
        });

        // Call both endpoints in parallel:
        // 1. /generate-reasoning - Fast (2-4s) - Provides immediate reasoning
        // 2. /generate-artifact - Slow (30-60s) - Generates the actual artifact
        const reasoningPromise = fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reasoning`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({ prompt: userMessage }),
          }
        ).then(async (res) => {
          if (!res.ok) {
            console.warn("⚠️ Reasoning generation failed, continuing without it");
            return null;
          }
          return res.json();
        }).catch((err) => {
          console.warn("⚠️ Reasoning fetch error:", err);
          return null;
        });

        const artifactPromise = fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-artifact`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({
              prompt: userMessage,
              artifactType: "react", // Default to React artifacts
              sessionId: isAuthenticated ? sessionId : undefined,
            }),
          }
        );

        // Wait for reasoning first (fast ~2-4s) - show it immediately
        const reasoningData = await reasoningPromise;

        if (reasoningData?.success && reasoningData.reasoning?.steps) {
          console.log(`🧠 [useChatMessages] Reasoning ready with ${reasoningData.reasoning.steps.length} steps - streaming now`);

          // Stream reasoning steps progressively while artifact generates
          const steps = reasoningData.reasoning.steps;
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const progressPercentage = 10 + Math.round((i / steps.length) * 40); // 10-50%

            // Create partial reasoning with steps up to current index
            const partialReasoning = {
              steps: steps.slice(0, i + 1),
              summary: i === steps.length - 1 ? reasoningData.reasoning.summary : undefined,
            };

            onDelta("", {
              stage: i === 0 ? "analyzing" : i < steps.length - 1 ? "planning" : "generating",
              message: step.title || `Step ${i + 1}`,
              artifactDetected: true,
              percentage: progressPercentage,
              reasoningSteps: partialReasoning,
            });

            // Brief pause between steps for animation effect
            if (i < steps.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 600));
            }
          }
        }

        // Update progress while waiting for artifact
        onDelta("", {
          stage: "generating",
          message: "Generating artifact code...",
          artifactDetected: true,
          percentage: 55,
          reasoningSteps: reasoningData?.reasoning || undefined,
        });

        // Now wait for artifact generation to complete
        const artifactResponse = await artifactPromise;

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

          // Handle retryable errors (503)
          if (artifactResponse.status === 503 && errorData.retryable) {
            throw new Error("SERVICE_UNAVAILABLE");
          }

          const errorMsg = errorData.error || "Failed to generate artifact";
          throw new Error(errorMsg);
        }

        const artifactData = await artifactResponse.json();

        if (!artifactData.success || !artifactData.artifactCode) {
          throw new Error("No artifact code returned");
        }

        console.log("✅ [useChatMessages] Artifact generated successfully, length:", artifactData.artifactCode.length);

        const artifactCode = artifactData.artifactCode;

        // Use the pre-generated reasoning (from fast model) for display
        // Fall back to GLM reasoning if pre-generation failed
        const finalReasoning = reasoningData?.reasoning || artifactData.reasoningSteps;

        // CRITICAL: Clear streaming state BEFORE saving to prevent duplicate keys
        // The saved message will render with the artifact code, so we don't need
        // the streaming message anymore. Clearing it first prevents both from
        // rendering simultaneously with the same content/key.
        setIsLoading(false);
        onDone(); // This clears streamingMessage and isStreaming

        // Small delay to ensure streaming state is cleared before saving
        await new Promise(resolve => setTimeout(resolve, 50));

        // Save the assistant response with reasoning data
        // Store raw GLM reasoning for potential debugging, but use structured for display
        await saveMessage("assistant", artifactCode, artifactData.reasoning || undefined, finalReasoning || undefined);

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
            // CHAIN OF THOUGHT: Handle reasoning events
            // Character-by-character streaming is handled in ReasoningDisplay component
            // ========================================
            if (parsed.type === 'reasoning') {
              // Check sequence number to prevent out-of-order updates
              // Use < not <= to allow the first event with sequence 0
              if (parsed.sequence < lastSequence) {
                console.warn('[StreamProgress] Ignoring out-of-order reasoning event');
                continue;
              }
              lastSequence = parsed.sequence;

              // Store and send the complete reasoning data
              // The ReasoningDisplay component will handle character-by-character streaming
              reasoningSteps = parsed.data;

              const progress = updateProgress();
              progress.reasoningSteps = reasoningSteps;
              onDelta('', progress);

              console.log('[StreamProgress] Received reasoning with', reasoningSteps?.steps?.length || 0, 'steps');
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
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
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
        return streamChat(userMessage, onDelta, onDone, currentArtifact, forceImageMode, forceArtifactMode, retryCount + 1);
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
