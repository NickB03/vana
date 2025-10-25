import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUMMARIZATION_THRESHOLD = 10; // Summarize every 10 messages

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { sessionId } = requestBody;
    
    // Input validation
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid session ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create summarization prompt
    const conversationText = messagesToSummarize
      .map(m => `${m.role}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = session.conversation_summary
      ? `Previous summary: ${session.conversation_summary}\n\nCreate a concise summary that builds on the previous summary and incorporates the new conversation below. Focus on key topics, decisions, and important information.`
      : "Create a concise summary of the following conversation. Focus on key topics, decisions, and important information.";

    console.log("Calling AI for summarization...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conversationText }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content;

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
    console.error("Summarization error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred while summarizing the conversation" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
