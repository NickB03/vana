import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { callGLM45AirWithRetry, extractTextFromGLM45Air, type GLM45AirMessage } from "../_shared/glm-client.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";

const SUMMARIZATION_THRESHOLD = 10; // Summarize every 10 messages

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const requestId = crypto.randomUUID();
  const errors = ErrorResponseBuilder.withHeaders(corsHeaders, requestId);

  try {
    const requestBody = await req.json();
    const { sessionId } = requestBody;
    
    // Input validation
    if (!sessionId || typeof sessionId !== "string") {
      return errors.validation("Invalid session ID", "sessionId is required and must be a string");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errors.unauthorized("Invalid or expired authentication token");
    }

    // Verify session ownership
    const { data: sessionOwnership, error: ownershipError } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (ownershipError || !sessionOwnership || sessionOwnership.user_id !== user.id) {
      return errors.forbidden(
        "Access denied",
        "You do not have permission to summarize this session"
      );
    }

    console.log("Starting summarization for session:", sessionId);

    // Get session info
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("summary_checkpoint, conversation_summary")
      .eq("id", sessionId)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    // Get all messages
    const { data: allMessages, count } = await supabase
      .from("chat_messages")
      .select("role, content", { count: "exact" })
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!allMessages || !count) {
      throw new Error("No messages found");
    }

    const checkpoint = session.summary_checkpoint || 0;
    const newMessages = count - checkpoint;

    console.log(`Total messages: ${count}, Checkpoint: ${checkpoint}, New: ${newMessages}`);

    // Only summarize if we have enough new messages
    if (newMessages < SUMMARIZATION_THRESHOLD) {
      console.log("Not enough messages for summarization");
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: `Only ${newMessages} new messages (threshold: ${SUMMARIZATION_THRESHOLD})` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare messages for summarization
    const messagesToSummarize = allMessages.slice(checkpoint);

    // Create summarization prompt
    const conversationText = messagesToSummarize
      .map(m => `${m.role}: ${m.content}`)
      .join("\n\n");

    const systemContent = session.conversation_summary
      ? `Previous summary: ${session.conversation_summary}\n\nCreate a concise summary that builds on the previous summary and incorporates the new conversation below. Focus on key topics, decisions, and important information.`
      : "Create a concise summary of the following conversation. Focus on key topics, decisions, and important information.";

    console.log("Calling GLM-4.5-Air for summarization...");

    const messages: GLM45AirMessage[] = [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: conversationText
      }
    ];

    const response = await callGLM45AirWithRetry(messages, {
      temperature: 0.7,
      max_tokens: 1000,
      requestId
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GLM-4.5-Air error:", response.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const data = await response.json();
    const summary = extractTextFromGLM45Air(data);

    if (!summary) {
      throw new Error("No summary generated");
    }

    console.log("Summary generated, updating database...");

    // Update session with new summary
    const { error: updateError } = await supabase
      .from("chat_sessions")
      .update({
        conversation_summary: summary,
        summary_checkpoint: count,
        last_summarized_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      throw updateError;
    }

    console.log("Summarization complete!");

    // Invalidate cache
    try {
      await supabase.functions.invoke("cache-manager", {
        body: { sessionId, operation: "invalidate" },
      });
    } catch (cacheError) {
      console.warn("Cache invalidation failed:", cacheError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        messagesSummarized: newMessages,
        totalMessages: count
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error(`[${requestId}] Summarization error:`, e);
    return errors.internal(
      "An error occurred while summarizing the conversation",
      e instanceof Error ? e.message : "Unknown error"
    );
  }
});
