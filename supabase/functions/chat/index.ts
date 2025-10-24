import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId } = await req.json();
    
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting chat stream for session:", sessionId);

    // Try to get cached context with summary
    let contextMessages = messages;
    try {
      const cacheResponse = await supabase.functions.invoke("cache-manager", {
        body: { sessionId, operation: "get" },
      });
      
      if (cacheResponse.data?.cached) {
        const { messages: cachedMessages, summary } = cacheResponse.data.cached;
        console.log("Using cached context with summary");
        
        // If we have a summary, use it as context instead of all messages
        if (summary) {
          contextMessages = [
            { role: "system", content: `Previous conversation summary: ${summary}` },
            ...messages.slice(-5) // Include last 5 messages for immediate context
          ];
        } else {
          contextMessages = cachedMessages;
        }
      }
    } catch (cacheError) {
      console.warn("Cache fetch failed, using provided messages:", cacheError);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert full-stack developer and creative coding assistant specializing in rapid prototyping and interactive web applications.

ARTIFACT CREATION RULES:
Create artifacts for interactive UIs, data visualizations, games, tools, landing pages, dashboards, animations, and standalone web apps.

FORMAT: Wrap your code in artifact tags:
<artifact type="html" title="Descriptive Title">
...your complete, runnable HTML code...
</artifact>

QUALITY STANDARDS:
1. Self-contained and immediately runnable
2. Include ALL necessary libraries via CDN (Chart.js, Three.js, D3.js, Alpine.js, GSAP, Anime.js, p5.js, Particles.js, etc.)
3. Responsive and mobile-friendly design
4. Proper semantic HTML structure
5. Modern, beautiful styling (Tailwind CSS is auto-included)
6. Complete functionality - no placeholders or "TODO" comments
7. Accessible and user-friendly

LIBRARY USAGE:
- Tailwind CSS is automatically available - no need to include it
- For other libraries, include via CDN in your HTML:
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tsparticles@3/tsparticles.bundle.min.js"></script>

ARTIFACT EXAMPLES:
- Interactive dashboard with charts
- 3D visualization with Three.js
- Animated landing page with GSAP
- Data table with sorting/filtering
- Canvas-based game
- Particle effects background
- Form with real-time validation
- API data visualizer

ITERATIVE UPDATES:
When user asks to modify an artifact, return the complete updated code with the same title to replace it.

Always explain what you built and suggest possible improvements or next steps.`,
          },
          ...contextMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger background tasks (fire and forget)
    (async () => {
      try {
        // Update cache
        await supabase.functions.invoke("cache-manager", {
          body: { sessionId, operation: "update" },
        });
        
        // Trigger summarization check
        await supabase.functions.invoke("summarize-conversation", {
          body: { sessionId },
        });
      } catch (bgError) {
        console.warn("Background task error:", bgError);
      }
    })();

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
